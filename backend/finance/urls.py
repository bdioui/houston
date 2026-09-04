from rest_framework.routers import DefaultRouter

from .views import (
    AgreementMemberViewSet, BudgetCategoryViewSet, BudgetDetailViewSet,
    ExpanseViewSet, FinancialAgreementViewSet, SupplierViewSet,
)

router = DefaultRouter()
router.register("suppliers", SupplierViewSet, basename="supplier")
router.register("budget-categories", BudgetCategoryViewSet, basename="budget-category")
router.register("budget-details", BudgetDetailViewSet, basename="budget-detail")
router.register("agreements", FinancialAgreementViewSet, basename="agreement")
router.register("agreement-members", AgreementMemberViewSet, basename="agreement-member")
router.register("expanses", ExpanseViewSet, basename="expanse")

urlpatterns = router.urls
