from common.models import Status
from common.serializers import BaseModelSerializer, TenantRelatedField
from directory.models import Member, Partner
from projects.models import Axis, Project

from .models import (
    AgreementMember, BudgetCategory, BudgetDetail, Expanse, FinancialAgreement,
    Supplier,
)


class SupplierSerializer(BaseModelSerializer):
    class Meta:
        model = Supplier
        # `organization` est délibérément absent : il est posé par
        # TenantViewSet.perform_create, jamais par le client.
        fields = ["id", "name", "description", "siret", "sifac_code"]


class BudgetCategorySerializer(BaseModelSerializer):
    partner_id = TenantRelatedField(Partner, source="partner")

    class Meta:
        model = BudgetCategory
        fields = ["id", "partner_id", "title"]


class BudgetDetailSerializer(BaseModelSerializer):
    budget_category_id = TenantRelatedField(
        BudgetCategory, source="budget_category", required=True, allow_null=False
    )
    # Auto-référence : une ligne budgétaire peut en porter des sous-lignes.
    parent_id = TenantRelatedField(BudgetDetail, source="parent")

    class Meta:
        model = BudgetDetail
        fields = [
            "id", "budget_category_id", "parent_id", "title", "description",
            "budget", "start_date", "end_date",
        ]


class FinancialAgreementSerializer(BaseModelSerializer):
    # `allow_null=True` mais `required=True` : détacher une convention de son
    # projet est un geste légitime — c'est déjà ce que fait la suppression du
    # projet, via le `SET_NULL` du modèle — mais il doit rester explicite.
    # Omettre la clé reste une erreur, envoyer `null` est une décision.
    project_id = TenantRelatedField(Project, source="project", required=True, allow_null=True)
    partner_id = TenantRelatedField(Partner, source="partner", required=True, allow_null=False)
    axis_id = TenantRelatedField(Axis, source="axis")
    status_id = TenantRelatedField(Status, source="status")
    budget_detail_id = TenantRelatedField(BudgetDetail, source="budget_detail")

    class Meta:
        model = FinancialAgreement
        fields = [
            "id", "project_id", "partner_id", "axis_id", "status_id", "title",
            "description", "budget", "grant", "signed_date", "budget_detail_id",
        ]


class AgreementMemberSerializer(BaseModelSerializer):
    member_id = TenantRelatedField(Member, source="member", required=True, allow_null=False)
    agreement_id = TenantRelatedField(
        FinancialAgreement, source="agreement", required=True, allow_null=False
    )

    class Meta:
        model = AgreementMember
        fields = ["id", "member_id", "agreement_id"]


class ExpanseSerializer(BaseModelSerializer):
    budget_detail_id = TenantRelatedField(BudgetDetail, source="budget_detail")
    supplier_id = TenantRelatedField(Supplier, source="supplier")
    project_id = TenantRelatedField(Project, source="project")
    agreement_id = TenantRelatedField(FinancialAgreement, source="agreement")

    class Meta:
        model = Expanse
        # `flux_id` n'est pas déclaré : c'est un CharField, pas une référence.
        # Son nom finit par `_id` pour des raisons SIFAC, sans rapport avec la
        # convention de nommage des clés étrangères.
        fields = [
            "id", "title", "description", "category", "label",
            "budget_detail_id", "supplier_id", "project_id", "agreement_id",
            "purchase_date", "delivery_date", "payment_date", "invoice_date",
            "status", "flux_id", "source",
            "amount_engaged", "amount_invoiced", "amount_paid", "amount",
        ]
