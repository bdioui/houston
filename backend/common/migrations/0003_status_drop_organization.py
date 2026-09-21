"""Volet schéma du décloisonnement de `Status` — voir `0002` pour le pourquoi.

Séparée de `0002` parce que celle-là écrit dans `common_status` : Postgres
refuse ensuite tout `ALTER TABLE` sur cette table dans la même transaction.

Tout le DDL passe avant le seed, pour la même raison en miroir : semer d'abord
remettrait des écritures avant l'`ADD CONSTRAINT`. Le seed ferme donc la
marche, et c'est lui qui rend une base neuve utilisable — `0002` ne pouvait
rien créer tant qu'`organization_id` était NOT NULL.
"""

from importlib import import_module

from django.db import migrations, models

# `import_module` et non un `from . import` : un nom de module commençant par un
# chiffre n'est pas un identifiant Python valide. Importer la migration sœur
# plutôt que dupliquer le référentiel ou le sortir dans un module applicatif :
# une migration est figée, donc la table de vérité l'est aussi — un module
# partagé, lui, changerait rétroactivement ce que fait cette migration.
REFERENTIAL = import_module(
    "common.migrations.0002_status_global_referential"
).REFERENTIAL


def seed_referential(apps, schema_editor):
    Status = apps.get_model("common", "Status")
    existing = set(Status.objects.values_list("context", "code"))
    missing = [
        Status(context=context, code=code, label=label)
        for context, rows in REFERENTIAL.items()
        for code, label in rows
        if (context, code) not in existing
    ]
    if missing:
        Status.objects.bulk_create(missing)


def noop(apps, schema_editor):
    """Rien à défaire : `0002` documente pourquoi le retour arrière est partiel."""


class Migration(migrations.Migration):

    dependencies = [
        ("common", "0002_status_global_referential"),
    ]

    operations = [
        # La contrainte part avant la colonne qu'elle nomme.
        migrations.RemoveConstraint(
            model_name="status",
            name="uniq_status_per_org",
        ),
        migrations.RemoveField(
            model_name="status",
            name="organization",
        ),
        migrations.AlterModelOptions(
            name="status",
            options={"ordering": ["context", "id"], "verbose_name_plural": "statuses"},
        ),
        migrations.AddConstraint(
            model_name="status",
            constraint=models.UniqueConstraint(
                fields=("context", "code"), name="uniq_status_code_per_context"
            ),
        ),
        migrations.RunPython(seed_referential, noop),
    ]
