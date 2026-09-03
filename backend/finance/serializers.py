from common.serializers import BaseModelSerializer

from .models import Supplier


class SupplierSerializer(BaseModelSerializer):
    class Meta:
        model = Supplier
        # `organization` est délibérément absent : il est posé par
        # TenantViewSet.perform_create, jamais par le client.
        fields = ["id", "name", "description", "siret", "sifac_code"]
