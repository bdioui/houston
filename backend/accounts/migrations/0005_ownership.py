"""Le rôle d'organisation devient une propriété, l'invitation cesse d'en donner.

Deux renommages avec reprise, et ils ne sont pas symétriques.

`OrganizationMember.role` → `is_owner`. La traduction est directe — les
administrateurs d'hier sont les propriétaires d'aujourd'hui — mais le sens
change : ce n'était qu'un grade parmi deux, c'est désormais la trace de qui a
fondé l'espace de travail. La migration 0004 les avait désignés par le plus
petit `user_id` de chaque laboratoire, c'est-à-dire par leur fondateur. Un
laboratoire peut en avoir promu d'autres depuis, par l'écran de partage : ils
sont repris eux aussi, et c'est la seule lecture honnête — ils détenaient
exactement les droits que `is_owner` porte désormais. Le propriétaire est donc
unique à la création, pas par contrainte.

`Invitation.role` → `is_program_admin`. Là, la traduction est un changement de
portée : un champ qui accordait le laboratoire entier n'accorde plus que le
programme visé. Les invitations en attente émises « comme administrateur » sont
converties en administrateurs de leur programme — c'est-à-dire moins que ce qui
leur avait été promis. Le contraire serait pire : leur laisser le laboratoire
fabriquerait des propriétaires que personne n'a désignés.
"""

from django.db import migrations, models


def owners_from_admins(apps, schema_editor):
    OrganizationMember = apps.get_model("accounts", "OrganizationMember")
    OrganizationMember.objects.filter(role="admin").update(is_owner=True)

    Invitation = apps.get_model("accounts", "Invitation")
    Invitation.objects.filter(role="admin").update(is_program_admin=True)


def admins_from_owners(apps, schema_editor):
    OrganizationMember = apps.get_model("accounts", "OrganizationMember")
    OrganizationMember.objects.filter(is_owner=True).update(role="admin")
    OrganizationMember.objects.filter(is_owner=False).update(role="member")

    Invitation = apps.get_model("accounts", "Invitation")
    Invitation.objects.filter(is_program_admin=True).update(role="admin")
    Invitation.objects.filter(is_program_admin=False).update(role="member")


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_organizationmember_role_invitation"),
    ]

    operations = [
        migrations.AddField(
            model_name="organizationmember",
            name="is_owner",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="invitation",
            name="is_program_admin",
            field=models.BooleanField(default=False),
        ),
        # Entre l'ajout et la suppression, délibérément : les deux colonnes
        # coexistent le temps de la reprise, sinon il n'y aurait plus rien à
        # lire pour la remplir.
        migrations.RunPython(owners_from_admins, admins_from_owners),
        migrations.RemoveField(model_name="organizationmember", name="role"),
        migrations.RemoveField(model_name="invitation", name="role"),
    ]
