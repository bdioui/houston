"""Le rôle d'organisation, et les invitations qu'il commande.

Le `default='member'` de la colonne est le bon défaut pour la suite, et le
mauvais pour l'existant : appliqué tel quel, il laisserait chaque laboratoire
sans un seul compte capable d'y inviter quelqu'un — un verrou sans clé, qu'il
faudrait rouvrir à la main en shell sur chaque installation.

D'où la reprise ci-dessous. Elle promeut, dans chaque laboratoire, le compte au
plus petit `user_id` — et le critère mérite sa justification, parce que le
choix évident est faux.

Le fondateur n'est *pas* repérable par la date du rattachement. Les lignes
d'`OrganizationMember` ont été écrites en bloc par la migration 0003, donc à la
même microseconde et dans l'ordre où PostgreSQL a rendu les comptes : sur la
base de développement, ce tri désigne un compte de support plutôt que le
fondateur. Une date posée par une reprise ne raconte que la reprise.

L'identifiant du compte, lui, date de l'inscription. Avant cette migration le
seul chemin de création d'un laboratoire était `POST /api/auth/signup/`, qui
crée le compte et le laboratoire d'un même geste : tout autre compte du même
laboratoire a donc été ajouté après, à la main, avec un identifiant plus grand.
Le raisonnement ne vaudra plus une fois les invitations en service — un invité
peut très bien avoir un compte plus ancien que le fondateur qui l'invite — mais
il vaut exactement sur les données que cette migration voit passer.
"""

import accounts.models
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def promote_founders(apps, schema_editor):
    OrganizationMember = apps.get_model("accounts", "OrganizationMember")
    Organization = apps.get_model("accounts", "Organization")

    promoted = []
    for org_id in Organization.objects.values_list("id", flat=True):
        founder = (
            OrganizationMember.objects.filter(organization_id=org_id)
            .order_by("user_id")
            .first()
        )
        if founder is not None:
            founder.role = "admin"
            promoted.append(founder)
    OrganizationMember.objects.bulk_update(promoted, ["role"])


def demote_all(apps, schema_editor):
    """Le retour en arrière n'a rien à restaurer : avant cette migration le
    rôle n'existait pas. Il remet simplement la colonne à son défaut, pour que
    rejouer la migration en avant reparte d'un état propre."""
    OrganizationMember = apps.get_model("accounts", "OrganizationMember")
    OrganizationMember.objects.update(role="member")


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_organization_member'),
        ('directory', '0001_initial'),
        ('projects', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='organizationmember',
            name='role',
            field=models.CharField(choices=[('admin', 'Administrateur'), ('member', 'Membre')], default='member', max_length=20),
        ),
        migrations.RunPython(promote_founders, demote_all),
        migrations.CreateModel(
            name='Invitation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(max_length=254)),
                ('first_name', models.CharField(blank=True, default='', max_length=150)),
                ('last_name', models.CharField(blank=True, default='', max_length=150)),
                ('role', models.CharField(choices=[('admin', 'Administrateur'), ('member', 'Membre')], default='member', max_length=20)),
                ('token', models.CharField(default=accounts.models._default_token, max_length=64, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField(default=accounts.models._default_expiry)),
                ('accepted_at', models.DateTimeField(blank=True, null=True)),
                ('invited_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sent_invitations', to=settings.AUTH_USER_MODEL)),
                ('member', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='invitations', to='directory.member')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='+', to='accounts.organization')),
                ('program', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='invitations', to='projects.program')),
            ],
            options={
                'ordering': ['-created_at'],
                'constraints': [models.UniqueConstraint(condition=models.Q(('accepted_at__isnull', True)), fields=('organization', 'email'), name='uniq_pending_invitation_per_org')],
            },
        ),
    ]
