"""Orchestration de l'import SIFAC.

Port de `frontend/src/lib/sifac/import.ts`, et seul module de la chaîne à
écrire. Les trois autres (`parse`, `aggregate`, `reconcile`) sont purs.

Synchrone, délibérément. La décision d'architecture prévoit Celery ; le passage
en tâche de fond change la forme de l'API (identifiant de tâche, endpoint de
statut, polling côté front) et n'apporte rien tant qu'un import tient dans le
temps d'une requête. `run_import` est déjà écrite pour être appelée depuis une
tâche : elle ne touche ni `request` ni le ContextVar, elle reçoit son
organisation et son programme en arguments.

ATTENTION : les managers, eux, lisent bien le ContextVar. Appelée depuis une
tâche de fond, cette chaîne exige donc que `set_current_org` et
`set_current_program` aient été posés — passer les arguments ne suffit pas.
"""

from __future__ import annotations

from dataclasses import dataclass

from django.db import transaction

from common.tenant import ProgramContextRequired
from finance.models import Expanse, Supplier

from .aggregate import FluxAggregate, aggregate_by_flux
from .models import SifacLine
from .parse import SifacParseError, parse_sifac_export
from .reconcile import ORPHAN_STATUS, SIFAC_OWNED_FIELDS, reconcile

# Colonnes de SifacLine alimentées par le parseur. `organization` et `program`
# s'y ajoutent à l'insertion, `id` est attribué par la base.
SIFAC_LINE_FIELDS = (
    "pfi", "exercice", "flux_id", "flux_label", "rubrique", "supplier_name",
    "supplier_code", "account", "account_label", "engagement_date", "csf_date",
    "amount_engaged", "amount_certified", "amount_received", "invoice_number",
    "invoice_date", "invoice_text", "amount_invoiced", "amount_paid",
    "payment_date", "amount_report", "otp", "category",
)

# `supplier_id` est l'attname ; bulk_update() veut le nom du champ.
_UPDATE_FIELDS = sorted(
    "supplier" if f == "supplier_id" else f for f in SIFAC_OWNED_FIELDS
)


class SifacScopeError(ValueError):
    """Le fichier ne porte pas sur le programme dans lequel on travaille.

    Distincte de SifacParseError : le fichier est parfaitement lisible, c'est
    la destination qui ne va pas. Les deux remontent en 400, mais les
    confondre ferait chercher un défaut de format là où il n'y en a pas.
    """


def _check_scope(pfi: str, program) -> None:
    """Le programme actif commande, le fichier doit s'y conformer.

    L'inverse — déduire le programme du PFI lu dans le fichier — serait plus
    souple et c'est justement le problème : téléverser le mauvais export
    écraserait un périmètre que l'utilisateur ne regarde même pas. `run_import`
    commence par un DELETE ; une erreur de fichier doit s'arrêter ici, pas se
    découvrir après coup.
    """
    if program is None:
        # Le parcours d'import ne touche un ProgramModel qu'après le parsing :
        # sans ce garde, l'absence de programme sortirait en AttributeError
        # plutôt qu'en 409.
        raise ProgramContextRequired("Import SIFAC demandé hors contexte programme.")

    if program.pfi == pfi:
        return

    if not program.pfi:
        raise SifacScopeError(
            f"Le programme « {program.name} » ne porte aucun PFI : aucun export "
            "SIFAC ne peut lui être rattaché."
        )

    raise SifacScopeError(
        f"Ce fichier porte le PFI {pfi}, alors que le programme actif "
        f"« {program.name} » porte {program.pfi}. Changez de programme actif, "
        "ou de fichier."
    )


@dataclass
class ImportSummary:
    pfi: str
    exercice: int
    line_count: int
    flux_count: int
    created: int
    updated: int
    orphaned: int


def preview(source, program) -> dict:
    """Premier temps : on lit le fichier sans rien écrire.

    L'exercice rendu n'est qu'une proposition — il n'existe nulle part dans
    l'export et conditionne le périmètre qui sera écrasé, donc il doit passer
    par l'utilisateur.

    Le contrôle de périmètre est refait ici alors que `run_import` le refera :
    c'est l'écran de confirmation qui doit annoncer l'erreur de fichier, pas la
    réponse au clic qui valide l'écrasement.
    """
    pfi, exercice, rows = parse_sifac_export(source)
    _check_scope(pfi, program)
    return {
        "pfi": pfi,
        "exercice": exercice,
        "line_count": len(rows),
        "flux_count": len(aggregate_by_flux(rows)),
    }


def _resolve_suppliers(
    aggregates: list[FluxAggregate], organization
) -> dict[str, int]:
    """Garantit qu'une fiche fournisseur existe pour chaque code tiers
    rencontré, et rend la table code → id que `reconcile` consultera.

    Le rapprochement se fait sur `sifac_code` seul, jamais sur le nom : SIFAC a
    déjà dédoublonné ses tiers, son code est stable, un nom ne l'est pas. Les
    fiches saisies à la main avant SIFAC n'ont pas de code — elles ne matchent
    donc pas et l'import créera un doublon, à fusionner une fois à la main.
    """
    by_code = {
        s.sifac_code: s.id
        for s in Supplier.objects.exclude(sifac_code="")
    }

    # Un code vide n'est pas un fournisseur inconnu : les écritures de paie ne
    # portent aucun tiers. Les créer donnerait une fiche au nom vide sur
    # laquelle toute la masse salariale viendrait pointer.
    missing: dict[str, str] = {}
    for a in aggregates:
        if a.supplier_code == "" or a.supplier_code in by_code:
            continue
        missing.setdefault(a.supplier_code, a.supplier_name)

    if missing:
        created = Supplier.objects.bulk_create([
            Supplier(
                organization=organization,
                name=name,
                description="",
                siret="",
                sifac_code=code,
            )
            for code, name in missing.items()
        ])
        by_code.update({s.sifac_code: s.id for s in created})

    return by_code


@transaction.atomic
def run_import(source, exercice: int, organization, program) -> ImportSummary:
    """Second temps : on écrit.

    Tout se joue dans une seule transaction. Le remplacement de périmètre
    supprime avant d'insérer ; sans atomicité, une erreur au milieu laisserait
    l'exercice vidé et l'utilisateur sans recours.
    """
    pfi, _suggested, rows = parse_sifac_export(source)
    _check_scope(pfi, program)

    # L'exercice confirmé peut différer de celui proposé : les lignes sont
    # réestampillées avant remplacement.
    for r in rows:
        r["exercice"] = exercice

    # Un export vide traduit un fichier mal lu, jamais un exercice réellement
    # vide : sans ce garde-fou, un parsing raté effacerait le périmètre sans
    # avertissement. `parse_sifac_export` lève déjà dans ce cas ; la ceinture
    # reste parce que c'est la ligne juste avant un DELETE.
    if not rows:
        raise SifacParseError(
            f"Import SIFAC {pfi} / {exercice} : aucune ligne lue, "
            "périmètre inchangé."
        )

    # Le remplacement porte sur le couple (programme, exercice) et rien d'autre :
    # l'export est un instantané complet de ce périmètre, pas un différentiel.
    # Le programme n'apparaît pas dans le filtre parce que `objects` l'applique
    # déjà — et c'est mieux ainsi : filtrer sur `pfi`, colonne recopiée du
    # fichier, ferait dépendre un DELETE d'une donnée non contrainte.
    SifacLine.objects.filter(exercice=exercice).delete()
    SifacLine.objects.bulk_create([
        SifacLine(
            organization=organization,
            program=program,
            **{f: r[f] for f in SIFAC_LINE_FIELDS},
        )
        for r in rows
    ])

    # On réagrège sur tout le programme, pas sur le seul périmètre importé : un
    # flux engagé en 2025 et reporté en 2026 a ses lignes réparties sur deux
    # exercices et doit rester une dépense unique.
    all_lines = list(
        SifacLine.objects.values(*SIFAC_LINE_FIELDS)
    )
    aggregates = aggregate_by_flux(all_lines)

    # Les fournisseurs sont créés avant la réconciliation : leurs ids doivent
    # exister au moment où les dépenses sont fabriquées.
    suppliers = _resolve_suppliers(aggregates, organization)

    plan = reconcile(aggregates, Expanse.objects.all(), suppliers)

    if plan.to_create:
        Expanse.objects.bulk_create([
            Expanse(organization=organization, program=program, **data)
            for data in plan.to_create
        ])

    if plan.to_update:
        patch_by_id = dict(plan.to_update)
        targets = list(Expanse.objects.filter(id__in=patch_by_id))
        for e in targets:
            for key, value in patch_by_id[e.id].items():
                setattr(e, key, value)
        Expanse.objects.bulk_update(targets, _UPDATE_FIELDS)

    if plan.to_orphan:
        Expanse.objects.filter(id__in=plan.to_orphan).update(status=ORPHAN_STATUS)

    return ImportSummary(
        pfi=pfi,
        exercice=exercice,
        line_count=len(rows),
        flux_count=len(aggregates),
        created=len(plan.to_create),
        updated=len(plan.to_update),
        orphaned=len(plan.to_orphan),
    )
