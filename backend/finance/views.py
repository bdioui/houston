from common.views import TenantViewSet

from .models import Supplier
from .serializers import SupplierSerializer


class SupplierViewSet(TenantViewSet):
    serializer_class = SupplierSerializer

    # Méthode et non attribut `queryset` : un attribut de classe est évalué à
    # l'import du module, hors contexte tenant, et TenantManager lèverait avant
    # même que Django ait fini de démarrer.
    def get_queryset(self):
        return Supplier.objects.all()
