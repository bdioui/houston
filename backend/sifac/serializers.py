from common.serializers import BaseModelSerializer

from .models import SifacLine


class SifacLineSerializer(BaseModelSerializer):
    class Meta:
        model = SifacLine
        # Aucune clé étrangère : la table est une copie plate de l'export.
        # `flux_id` et `supplier_code` sont des chaînes venues du fichier, pas
        # des références — d'où l'absence de TenantRelatedField ici.
        fields = [
            "id", "pfi", "exercice", "flux_id", "flux_label", "rubrique",
            "supplier_name", "supplier_code", "account", "account_label",
            "engagement_date", "csf_date",
            "amount_engaged", "amount_certified", "amount_received",
            "invoice_number", "invoice_date", "invoice_text",
            "amount_invoiced", "amount_paid", "payment_date", "amount_report",
            "otp", "category",
        ]
