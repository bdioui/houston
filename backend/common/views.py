from rest_framework import viewsets

from .tenant import get_current_org


class TenantViewSet(viewsets.ModelViewSet):
    """Base de toutes les vues portant sur un modèle tenant.

    Elle ne filtre rien elle-même : `Model.objects` est déjà un TenantManager,
    donc le queryset est cloisonné avant d'arriver ici. Son seul apport est de
    renseigner `organization` à la création, champ que le sérialiseur n'expose
    pas et que le client ne doit jamais pouvoir choisir.
    """

    def perform_create(self, serializer):
        serializer.save(organization=get_current_org())
