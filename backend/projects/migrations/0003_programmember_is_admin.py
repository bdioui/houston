"""L'administration d'un programme, et la place du propriétaire dans chacun.

Le `default=False` est le bon défaut pour la suite et le mauvais pour
l'existant : appliqué tel quel, il laisserait chaque programme sans personne
pour en gérer l'équipe. Même piège qu'à la migration 0004 d'`accounts`, et même
remède — sauf qu'ici il ne suffit pas de promouvoir, il faut parfois affecter.

La règle posée est que le propriétaire administre tous les programmes de son
espace de travail. Elle est tenue **en données** et non par une exception dans
le middleware : le propriétaire est affecté comme administrateur à chaque
programme, et le code du cloisonnement garde sa règle unique — l'affectation est
l'autorisation. C'est ce que fait `create` pour les programmes à venir ; c'est ce
que cette migration fait pour ceux qui existent déjà, y compris ceux que le
propriétaire n'a jamais ouverts.

Un propriétaire sans fiche annuaire — compte de support — est sauté : une
affectation passe par `Member`, pas par `User`, il n'y a rien à écrire pour lui.
"""

from django.db import migrations, models


def affect_owners(apps, schema_editor):
    OrganizationMember = apps.get_model("accounts", "OrganizationMember")
    Program = apps.get_model("projects", "Program")
    ProgramMember = apps.get_model("projects", "ProgramMember")

    owners = OrganizationMember.objects.filter(
        is_owner=True, member__isnull=False
    ).values_list("organization_id", "member_id")

    for org_id, member_id in owners:
        for program_id in Program.objects.filter(
            organization_id=org_id
        ).values_list("id", flat=True):
            link, created = ProgramMember.objects.get_or_create(
                organization_id=org_id,
                program_id=program_id,
                member_id=member_id,
                defaults={"is_admin": True, "role": ""},
            )
            if not created and not link.is_admin:
                link.is_admin = True
                link.save(update_fields=["is_admin"])


def unaffect(apps, schema_editor):
    """Le retour en arrière retire le titre, pas l'affectation.

    Les lignes créées ici sont indiscernables d'une affectation faite à la main,
    et en supprimer une fermerait à quelqu'un un programme qu'il ouvrait peut-
    être depuis des semaines. Perdre un droit qui n'existe plus est sans
    conséquence ; perdre un accès ne l'est pas.
    """
    ProgramMember = apps.get_model("projects", "ProgramMember")
    ProgramMember.objects.update(is_admin=False)


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0002_backfill_program_members"),
        # Pour `is_owner`, que la reprise ci-dessus interroge.
        ("accounts", "0005_ownership"),
    ]

    operations = [
        migrations.AddField(
            model_name="programmember",
            name="is_admin",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(affect_owners, unaffect),
    ]
