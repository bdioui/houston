from contextlib import contextmanager

from django.db import IntegrityError, transaction
from rest_framework import serializers, viewsets

from .models import Status
from .serializers import StatusSerializer
from .tenant import get_current_org

# Code SQLSTATE d'une violation de contrainte d'unicité.
UNIQUE_VIOLATION = "23505"


@contextmanager
def unique_violation_as_400():
    """Traduit une violation d'unicité en 400 plutôt qu'en 500.

    `BaseModelSerializer` ne couvre que les validateurs que DRF sait construire,
    et DRF n'en construit aucun quand la contrainte porte une `condition`
    (index partiel) ou nomme un champ absent du sérialiseur — `organization`,
    justement, que le client ne doit jamais voir. Les deux cas se cumulent sur
    `uniq_supplier_sifac_code_per_org` et `uniq_expanse_flux_per_org`, qui
    partaient donc en base et remontaient en IntegrityError.

    Le bloc `atomic` imbriqué est indispensable : TenantMiddleware ouvre déjà
    une transaction pour toute la requête, et une contrainte violée la marque
    « à annuler ». Sans point de sauvegarde à qui revenir, la réponse 400
    échouerait à son tour au commit.
    """

    try:
        with transaction.atomic():
            yield
    except IntegrityError as exc:
        cause = getattr(exc, "__cause__", None)
        if getattr(cause, "sqlstate", getattr(cause, "pgcode", None)) != UNIQUE_VIOLATION:
            # Clé étrangère absente, NOT NULL violé : ce sont des bugs, pas des
            # saisies invalides. Les laisser remonter en 500.
            raise
        name = getattr(getattr(cause, "diag", None), "constraint_name", None)
        detail = "Cette valeur existe déjà pour ce laboratoire."
        if name:
            detail += f" (contrainte « {name} »)"
        raise serializers.ValidationError({"non_field_errors": [detail]}) from exc


class TenantViewSet(viewsets.ModelViewSet):
    """Base de toutes les vues portant sur un modèle tenant.

    Elle ne filtre rien elle-même : `Model.objects` est déjà un TenantManager,
    donc le queryset est cloisonné avant d'arriver ici. Ses deux apports sont
    de renseigner `organization` à la création — champ que le sérialiseur
    n'expose pas et que le client ne doit jamais pouvoir choisir — et de
    rattraper les violations d'unicité que DRF ne sait pas anticiper.
    """

    def get_create_kwargs(self):
        """Champs posés par le serveur à la création.

        Point d'extension à préférer à une surcharge de `perform_create` : une
        sous-classe qui redéfinit `perform_create` perdrait silencieusement le
        rattrapage des violations d'unicité.
        """
        return {"organization": get_current_org()}

    def perform_create(self, serializer):
        with unique_violation_as_400():
            serializer.save(**self.get_create_kwargs())

    def perform_update(self, serializer):
        with unique_violation_as_400():
            serializer.save()


class StatusViewSet(TenantViewSet):
    """`Status` vit dans `common` parce qu'il est référencé depuis `actions`
    comme depuis `projects` et `finance` ; sa route suit le modèle.
    """

    serializer_class = StatusSerializer

    def get_queryset(self):
        return Status.objects.all()
