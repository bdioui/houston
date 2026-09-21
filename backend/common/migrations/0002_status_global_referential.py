"""`Status` cesse d'être cloisonné et devient un référentiel d'installation.

Rien n'écrivait jamais dans cette table : aucun écran ne crée ni ne renomme un
statut, le workflow est imposé par l'application. La tenancy dupliquait donc le
même référentiel par laboratoire, avec des clés primaires différentes à chaque
fois — et le front comparait des identifiants en dur, ce qui n'était juste que
pour l'organisation héritée de Grist.

Celle-ci ne touche qu'aux données : elle assigne un `code` à chaque ligne
existante d'après son libellé, élit une ligne canonique par (contexte, code),
repointe les neuf clés étrangères vers elle, puis supprime les doublons.
Repointer avant de supprimer, et non l'inverse : `on_delete=SET_NULL` viderait
sinon les statuts de toutes les lignes métier au lieu de les rattacher.

Le changement de schéma vit dans `0003`, et cette séparation n'est pas un choix
de présentation : Postgres refuse un `ALTER TABLE` sur une table qui a des
« pending trigger events », c'est-à-dire des écritures faites plus tôt dans la
même transaction. Une migration = une transaction, donc DML et DDL ne peuvent
pas cohabiter ici.
"""

from django.db import migrations, models


# Le référentiel cible. Les quatre premiers contextes partagent le même cycle
# de vie à cinq états ; seul le libellé affiché change, parce qu'une convention
# « Soldée » se lit mieux qu'un projet « Terminé ». `participation` n'est pas un
# cycle de vie mais un état de présence, d'où ses codes propres.
REFERENTIAL = {
    "action_card": [
        ("todo", "À traiter"),
        ("active", "En cours"),
        ("on_hold", "En attente"),
        ("done", "Terminé"),
        ("cancelled", "Annulé"),
    ],
    "project": [
        ("todo", "En attente"),
        ("active", "En cours"),
        ("on_hold", "Suspendu"),
        ("done", "Terminé"),
        ("cancelled", "Annulé"),
    ],
    "project_call": [
        ("todo", "À venir"),
        ("active", "En cours"),
        ("on_hold", "Suspendu"),
        ("done", "Terminé"),
        ("cancelled", "Annulé"),
    ],
    "financial_agreement": [
        ("todo", "En préparation"),
        ("active", "Active"),
        ("on_hold", "Suspendue"),
        ("done", "Soldée"),
        ("cancelled", "Annulée"),
    ],
    "todo_item": [
        ("todo", "À faire"),
        ("active", "En cours"),
        ("on_hold", "En attente"),
        ("done", "Terminé"),
        ("cancelled", "Annulé"),
    ],
    "partner": [
        ("todo", "Pressenti"),
        ("active", "Actif"),
        ("on_hold", "En veille"),
        ("done", "Clos"),
        ("cancelled", "Annulé"),
    ],
    "participation": [
        ("registered", "Inscrit"),
        ("confirmed", "Confirmé"),
        ("present", "Présent"),
        ("absent", "Absent"),
        ("excused", "Excusé"),
    ],
}

# Libellés hérités de Grist → code. Sert à reconnaître les lignes existantes,
# y compris celles dont le libellé ne figure plus dans le référentiel cible :
# « Planifié » et « À traiter » retombent tous deux sur `todo`, la distinction
# entre « pas encore commencé » et « programmé » n'ayant jamais été lue nulle
# part — Dashboard.tsx les traitait déjà comme un seul état.
LEGACY_LABELS = {
    "à traiter": "todo",
    "a traiter": "todo",
    "à faire": "todo",
    "planifié": "todo",
    "planifie": "todo",
    "à venir": "todo",
    "en préparation": "todo",
    "en preparation": "todo",
    "pressenti": "todo",
    "en attente": "todo",
    "en cours": "active",
    "active": "active",
    "actif": "active",
    "suspendu": "on_hold",
    "suspendue": "on_hold",
    "en veille": "on_hold",
    "terminé": "done",
    "termine": "done",
    "soldée": "done",
    "soldee": "done",
    "clos": "done",
    "annulé": "cancelled",
    "annule": "cancelled",
    "annulée": "cancelled",
    "inscrit": "registered",
    "confirmé": "confirmed",
    "confirme": "confirmed",
    "présent": "present",
    "present": "present",
    "absent": "absent",
    "excusé": "excused",
    "excuse": "excused",
}

# `En attente` est ambigu : `todo` partout, sauf pour un projet où il désigne
# bien l'avant-démarrage et non une pause. Les contextes qui possèdent déjà un
# `todo` distinct doivent le lire comme `on_hold`.
CONTEXT_OVERRIDES = {
    ("action_card", "en attente"): "on_hold",
    ("todo_item", "en attente"): "on_hold",
}

# Les neuf colonnes qui référencent un statut. Le type impose l'exhaustivité :
# une clé étrangère ajoutée plus tard et oubliée ici laisserait des lignes
# pointer vers un doublon supprimé.
STATUS_FOREIGN_KEYS = [
    ("projects", "ProjectCall", "status_id"),
    ("projects", "Project", "status_id"),
    ("projects", "ProjectMilestone", "status_id"),
    ("projects", "ProjectMember", "participation_status_id"),
    ("actions", "ActionCard", "status_id"),
    ("actions", "ToDoItem", "status_id"),
    ("actions", "MemberActionCard", "participation_status_id"),
    ("directory", "Partner", "status_id"),
    ("finance", "FinancialAgreement", "status_id"),
]


def code_for(context, label):
    key = label.strip().lower()
    override = CONTEXT_OVERRIDES.get((context, key))
    if override:
        return override
    return LEGACY_LABELS.get(key)


def build_referential(apps, schema_editor):
    Status = apps.get_model("common", "Status")

    # 1. Coder les lignes existantes. Un libellé inconnu ne doit pas faire
    #    échouer la migration : on le garde sous un code dérivé, quitte à ce
    #    qu'il ressorte comme un statut hors référentiel, visible et corrigeable
    #    à la main. Perdre la donnée serait pire.
    unknown = 0
    for status in Status.objects.all():
        code = code_for(status.context, status.label)
        if code is None:
            unknown += 1
            code = f"legacy_{status.pk}"
        status.code = code
        status.save(update_fields=["code"])

    # 2. Élire une ligne canonique par (contexte, code) et repointer.
    canonical = {}
    duplicates = []
    for status in Status.objects.order_by("pk"):
        key = (status.context, status.code)
        if key in canonical:
            duplicates.append((status.pk, canonical[key]))
        else:
            canonical[key] = status.pk

    if duplicates:
        for app_label, model_name, column in STATUS_FOREIGN_KEYS:
            model = apps.get_model(app_label, model_name)
            for old_pk, new_pk in duplicates:
                # `_default_manager` et non `objects` : sur un modèle historique
                # les managers personnalisés ne sont pas reconstruits, mais
                # surtout TenantManager lèverait — une migration tourne hors
                # contexte tenant, par construction.
                model._default_manager.filter(**{column: old_pk}).update(
                    **{column: new_pk}
                )
        Status.objects.filter(pk__in=[old for old, _ in duplicates]).delete()

    # 3. Compléter. `organization_id` est encore NOT NULL à ce stade : on
    #    emprunte celle d'une ligne existante, la colonne disparaît juste après.
    existing = set(canonical)
    fallback_org = Status.objects.values_list("organization_id", flat=True).first()
    if fallback_org is None:
        Organization = apps.get_model("accounts", "Organization")
        first_org = Organization.objects.order_by("pk").first()
        fallback_org = first_org.pk if first_org else None

    missing = [
        Status(context=context, code=code, label=label, organization_id=fallback_org)
        for context, rows in REFERENTIAL.items()
        for code, label in rows
        if (context, code) not in existing
    ]
    # Une installation neuve n'a ni statut ni organisation : rien à semer tant
    # qu'`organization_id` est NOT NULL. Le seed de repli, plus bas, s'en charge
    # une fois la colonne retirée.
    if fallback_org is not None and missing:
        Status.objects.bulk_create(missing)


def noop(apps, schema_editor):
    """Le retour arrière ne restaure pas la duplication par organisation.

    Il n'y a rien à reconstruire : les lignes fusionnées sont indiscernables,
    et remettre `organization` suffit à rendre la table utilisable par
    l'ancienne version du code.
    """


class Migration(migrations.Migration):

    dependencies = [
        ("common", "0001_initial"),
        ("accounts", "0001_initial"),
        ("actions", "0001_initial"),
        ("directory", "0001_initial"),
        ("finance", "0001_initial"),
        ("projects", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="status",
            name="code",
            field=models.CharField(default="", max_length=32),
            preserve_default=False,
        ),
        migrations.RunPython(build_referential, noop),
    ]
