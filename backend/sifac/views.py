from rest_framework import viewsets

from .models import SifacLine
from .serializers import SifacLineSerializer


class SifacLineViewSet(viewsets.ReadOnlyModelViewSet):
    """Lecture seule : ces lignes ne sont écrites que par l'import, jamais par
    le client. D'où `ReadOnlyModelViewSet` et non `TenantViewSet` — il n'y a
    pas de `create` à qui poser l'organisation. Le cloisonnement reste assuré
    par `SifacLine.objects`, qui est un TenantManager.
    """

    serializer_class = SifacLineSerializer

    # `filterset_fields` et non `build_filterset` : SifacLine n'a aucune clé
    # étrangère, la table est volontairement plate. Ces trois champs sont des
    # chaînes, et ce sont exactement les deux index posés sur le modèle —
    # (pfi, exercice) pour le remplacement de périmètre, flux_id pour
    # l'agrégation.
    filterset_fields = ["pfi", "exercice", "flux_id"]

    def get_queryset(self):
        return SifacLine.objects.all()
