from common.views import TenantViewSet

from .models import (
    AgreementMember, BudgetCategory, BudgetDetail, Expanse, FinancialAgreement,
    Supplier,
)
from .serializers import (
    AgreementMemberSerializer, BudgetCategorySerializer, BudgetDetailSerializer,
    ExpanseSerializer, FinancialAgreementSerializer, SupplierSerializer,
)


class SupplierViewSet(TenantViewSet):
    serializer_class = SupplierSerializer

    # Méthode et non attribut `queryset` : un attribut de classe est évalué à
    # l'import du module, hors contexte tenant, et TenantManager lèverait avant
    # même que Django ait fini de démarrer.
    def get_queryset(self):
        return Supplier.objects.all()


class BudgetCategoryViewSet(TenantViewSet):
    serializer_class = BudgetCategorySerializer

    def get_queryset(self):
        return BudgetCategory.objects.all()


class BudgetDetailViewSet(TenantViewSet):
    serializer_class = BudgetDetailSerializer

    def get_queryset(self):
        return BudgetDetail.objects.all()


class FinancialAgreementViewSet(TenantViewSet):
    serializer_class = FinancialAgreementSerializer

    def get_queryset(self):
        return FinancialAgreement.objects.all()


class AgreementMemberViewSet(TenantViewSet):
    serializer_class = AgreementMemberSerializer

    def get_queryset(self):
        return AgreementMember.objects.all()


class ExpanseViewSet(TenantViewSet):
    serializer_class = ExpanseSerializer

    def get_queryset(self):
        return Expanse.objects.all()
