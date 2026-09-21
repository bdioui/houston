from rest_framework import serializers

from common.models import Status
from common.serializers import (
    BaseModelSerializer,
    ReferenceRelatedField,
    TenantRelatedField,
)

from .models import Lab, Member, Partner, Formation, PartnerLab


class LabSerializer(BaseModelSerializer):
    class Meta:
        model = Lab
        fields = ["id", "name", "description", "type", "topic"]


class PartnerSerializer(BaseModelSerializer):
    # Le front nomme les références `<champ>_id` — convention héritée de Grist,
    # tenue partout dans src/views/.
    status_id = ReferenceRelatedField(Status, source="status")

    class Meta:
        model = Partner
        fields = [
            "id", "name", "description", "color", "logo",
            "type", "consortium", "status_id",
        ]


class MemberSerializer(BaseModelSerializer):
    partner_id = TenantRelatedField(Partner, source="partner")
    lab_id = TenantRelatedField(Lab, source="lab")
    # La fiche a-t-elle un compte derrière elle ? C'est toute la différence
    # entre un contact — qu'on saisit pour s'en souvenir — et quelqu'un à qui
    # l'affectation ouvre une porte. Le front en a besoin pour ne griser le
    # retrait que dans le second cas : sans lui, il gèlerait les deux et
    # interdirait à une équipe de tenir son propre carnet d'adresses.
    #
    # Rendu comme booléen et non comme identifiant de compte : l'existence
    # suffit, et l'adresse du titulaire n'a pas à voyager avec l'annuaire.
    has_account = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = [
            "id", "partner_id", "lab_id", "first_name", "last_name",
            "position", "email", "tel", "genre", "status",
            "profile_image", "is_staff", "has_account",
        ]

    def get_has_account(self, member) -> bool:
        # `hasattr` sur un OneToOne inverse : une requête par fiche si la vue
        # n'a pas fait le `select_related("user_link")`, aucune sinon. C'est
        # `MemberViewSet.get_queryset` qui s'en charge.
        return hasattr(member, "user_link")


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
