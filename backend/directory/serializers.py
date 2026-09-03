from common.models import Status
from common.serializers import BaseModelSerializer, TenantRelatedField

from .models import Lab, Member, Partner, Formation, PartnerLab


class LabSerializer(BaseModelSerializer):
    class Meta:
        model = Lab
        fields = ["id", "name", "description", "type", "topic"]


class PartnerSerializer(BaseModelSerializer):
    # Le front nomme les références `<champ>_id` — convention héritée de Grist,
    # tenue partout dans src/views/.
    status_id = TenantRelatedField(Status, source="status")

    class Meta:
        model = Partner
        fields = [
            "id", "name", "description", "color", "logo",
            "type", "consortium", "status_id",
        ]


class MemberSerializer(BaseModelSerializer):
    partner_id = TenantRelatedField(Partner, source="partner")
    lab_id = TenantRelatedField(Lab, source="lab")

    class Meta:
        model = Member
        fields = [
            "id", "partner_id", "lab_id", "first_name", "last_name",
            "position", "email", "tel", "genre", "status",
            "profile_image", "is_staff",
        ]


class FormationSerializer(BaseModelSerializer):
    partner_id = TenantRelatedField(Partner, source="partner")
    
    class Meta:
        model = Formation
        fields = ["id", "code", "type", "title", "partner_id", "level", "degree_type", "formacode", "rome", "nsf", "status", "expiry_date", "is_national"]


class PartnerLabSerializer(BaseModelSerializer):
    partner_id = TenantRelatedField(Partner, source="partner", required=True, allow_null=False)
    lab_id  = TenantRelatedField(Lab,  source="lab",  required=True, allow_null=False)

    class Meta:
        model = PartnerLab
        fields = ["id", "partner_id", "lab_id"]
