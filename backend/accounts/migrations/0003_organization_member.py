"""Passage au multi-organisation.

L'ordre des opérations porte tout l'intérêt du fichier : la table naît, on y
recopie les rattachements existants, et seulement ensuite les deux colonnes de
User disparaissent. Inverser les deux dernières perdrait tous les comptes déjà
créés — ils se retrouveraient sans appartenance, donc sans contexte, donc en
403 sur la moindre collection.
"""

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def forwards(apps, schema_editor):
    """Un rattachement par compte qui en avait un.

    Les comptes de support — organisation nulle — n'en reçoivent aucun, ce qui
    est exactement leur état d'avant : rattachés à rien, et c'est voulu.
    """
    User = apps.get_model("accounts", "User")
    OrganizationMember = apps.get_model("accounts", "OrganizationMember")
    OrganizationMember.objects.bulk_create(
        [
            OrganizationMember(
                user_id=user.id,
                organization_id=user.organization_id,
                member_id=user.member_id,
            )
            for user in User.objects.exclude(organization_id=None)
        ]
    )


def backwards(apps, schema_editor):
    """Recolle un rattachement sur chaque compte, le premier venu.

    Irréversible en toute rigueur : un compte rattaché à deux laboratoires n'a
    plus de réponse unique à donner. On garde le plus ancien plutôt que de
    refuser la marche arrière, qui ne sert qu'en développement.
    """
    User = apps.get_model("accounts", "User")
    OrganizationMember = apps.get_model("accounts", "OrganizationMember")
    for user in User.objects.all():
        link = (
            OrganizationMember.objects.filter(user_id=user.id)
            .order_by("created_at")
            .first()
        )
        if link is not None:
            user.organization_id = link.organization_id
            user.member_id = link.member_id
            user.save(update_fields=["organization", "member"])


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_initial'),
        ('directory', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='OrganizationMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('member', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='user_link', to='directory.member')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='user_links', to='accounts.organization')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='org_links', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['organization__name'],
                'constraints': [models.UniqueConstraint(fields=('user', 'organization'), name='uniq_user_per_organization')],
            },
        ),
        migrations.RunPython(forwards, backwards),
        migrations.RemoveField(
            model_name='user',
            name='member',
        ),
        migrations.RemoveField(
            model_name='user',
            name='organization',
        ),
    ]
