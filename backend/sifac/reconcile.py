"""Comparaison des agrégats aux dépenses existantes.

Port de `frontend/src/lib/sifac/reconcile.ts`. Fonction pure : elle n'écrit
rien, elle rend trois listes que l'appelant applique.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .aggregate import FluxAggregate

# Une dépense SIFAC dont le flux a disparu de l'export n'est pas supprimée :
# elle porte peut-être un rattachement budgétaire à conserver. On la signale,
# l'arbitrage revient à l'utilisateur.
ORPHAN_STATUS = "Orpheline"

# Champs pilotés par SIFAC : eux seuls sont réécrits à chaque import. Tout le
# reste — projet, ligne budgétaire, convention — est le tri fait à la main et
# doit survivre au réimport.
SIFAC_OWNED_FIELDS = frozenset({
    "title", "description", "status", "amount",
    "amount_engaged", "amount_invoiced", "amount_paid",
    "purchase_date", "invoice_date", "payment_date", "category",
    "supplier_id", "delivery_date", "label",
})


@dataclass
class Reconciliation:
    to_create: list[dict] = field(default_factory=list)
    to_update: list[tuple[int, dict]] = field(default_factory=list)
    to_orphan: list[int] = field(default_factory=list)


def _sifac_owned(
    a: FluxAggregate,
    suppliers: dict[str, int],
    fallback_supplier_id: int | None,
) -> dict:
    """`fallback_supplier_id` couvre le cas où SIFAC ne désigne aucun tiers :
    les écritures de paie n'en portent pas. On conserve alors le fournisseur
    déjà en place au lieu d'effacer une affectation faite à la main.
    """
    return {
        "title": a.title,
        "description": a.supplier_name,
        "status": a.status,
        "amount": a.amount,
        "amount_engaged": a.amount_engaged,
        "amount_invoiced": a.amount_invoiced,
        "amount_paid": a.amount_paid,
        "purchase_date": a.purchase_date,
        "invoice_date": a.invoice_date,
        "payment_date": a.payment_date,
        "category": a.category,
        "label": a.account_label,
        "supplier_id": suppliers.get(a.supplier_code, fallback_supplier_id),
        "delivery_date": a.delivery_date,
    }


# Le TypeScript imposait l'exhaustivité par le type `Record<keyof SifacOwned,
# true>` : un champ ajouté et oublié cassait la compilation. Python n'a pas
# d'équivalent statique, d'où ce contrôle au chargement du module — il échoue au
# démarrage du serveur, pas au milieu d'un import, et compare les deux sources
# dans les deux sens.
def _assert_owned_fields_match() -> None:
    from datetime import date
    from decimal import Decimal

    probe = FluxAggregate(
        flux_id="", pfi="", title="", supplier_name="", supplier_code="",
        account="", account_label="", otp="", status="Engagé",
        amount=Decimal(0), amount_engaged=Decimal(0), amount_invoiced=Decimal(0),
        amount_paid=Decimal(0), amount_report=Decimal(0),
        purchase_date=date(2000, 1, 1), invoice_date=None, payment_date=None,
        delivery_date=None, line_count=0, category="",
    )
    produced = set(_sifac_owned(probe, {}, None))
    if produced != set(SIFAC_OWNED_FIELDS):
        raise RuntimeError(
            "SIFAC_OWNED_FIELDS et _sifac_owned() divergent — "
            f"absents de la liste : {sorted(produced - SIFAC_OWNED_FIELDS)}, "
            f"jamais produits : {sorted(SIFAC_OWNED_FIELDS - produced)}."
        )


_assert_owned_fields_match()


def reconcile(
    aggregates: list[FluxAggregate],
    expanses,
    suppliers: dict[str, int],
) -> Reconciliation:
    """La clé est le flux seul, jamais le couple (flux, exercice) : une commande
    engagée sur un exercice et reportée sur le suivant doit retomber sur la même
    dépense au lieu d'en créer une seconde.

    `expanses` est un itérable de `finance.Expanse` déjà cloisonné par tenant.
    """
    by_flux = {}
    for e in expanses:
        # Le filtre sur `source` est ce qui empêche le balayage des orphelines
        # d'emporter les dépenses saisies à la main.
        if e.source != "sifac" or e.flux_id is None:
            continue
        by_flux[e.flux_id] = e

    result = Reconciliation()
    seen: set[str] = set()

    for a in aggregates:
        seen.add(a.flux_id)
        existing = by_flux.get(a.flux_id)
        if existing is not None:
            result.to_update.append(
                (existing.id, _sifac_owned(a, suppliers, existing.supplier_id))
            )
        else:
            result.to_create.append({
                **_sifac_owned(a, suppliers, None),
                "flux_id": a.flux_id,
                "source": "sifac",
                "budget_detail_id": None,
                "project_id": None,
                "agreement_id": None,
            })

    result.to_orphan = [e.id for flux_id, e in by_flux.items() if flux_id not in seen]
    return result
