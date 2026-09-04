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

    def get_queryset(self):
        return SifacLine.objects.all()
