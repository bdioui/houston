from django.db import models

from .tenant import get_current_org


class TenantManager(models.Manager):
    """Manager par défaut des modèles multitenants.

    Il échoue bruyamment hors contexte tenant plutôt que de rendre les lignes de
    tous les laboratoires. Un oubli devient une erreur immédiate au lieu d'une
    fuite silencieuse.

    ATTENTION : à ce stade c'est la SEULE protection. Les politiques RLS
    PostgreSQL, qui rendraient l'isolation non contournable, arrivent au
    chantier 3 — elles supposent un rôle applicatif non-superutilisateur, que
    compose.yml ne fournit pas encore.
    """

    def get_queryset(self):
        org = get_current_org()
        if org is None:
            raise RuntimeError(
                f"{self.model.__name__} interrogé hors contexte tenant. "
                "Utiliser .all_tenants pour un accès délibérément global "
                "(migrations, admin, tâches Celery)."
            )
        return super().get_queryset().filter(organization=org)


class TenantModel(models.Model):
    organization = models.ForeignKey(
        "accounts.Organization",
        on_delete=models.CASCADE,
        related_name="+",
        db_index=True,
    )

    objects = TenantManager()
    # Indispensable : migrations, admin et tâches Celery s'exécutent hors
    # requête HTTP, donc sans tenant dans le ContextVar.
    all_tenants = models.Manager()

    class Meta:
        abstract = True


class Status(TenantModel):
    """Premier modèle multitenant, transverse aux apps.

    Il porte un `context` ('action_card' | 'project_call' | 'todo_item') et est
    donc référencé depuis `actions` comme depuis `projects` : le placer dans
    l'une des deux créerait une dépendance circulaire.
    """

    label = models.CharField(max_length=100)
    context = models.CharField(max_length=50)

    class Meta:
        verbose_name_plural = "statuses"
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "label", "context"],
                name="uniq_status_per_org",
            )
        ]

    def __str__(self) -> str:
        return f"{self.label} ({self.context})"
