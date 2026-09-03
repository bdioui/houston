from rest_framework.routers import DefaultRouter

from .views import LabViewSet, MemberViewSet, PartnerViewSet, PartnerLabViewSet, FormationViewSet

router = DefaultRouter()
router.register("labs", LabViewSet, basename="lab")
router.register("partners", PartnerViewSet, basename="partner")
router.register("members", MemberViewSet, basename="member")
router.register("formations", FormationViewSet, basename="formation")
router.register("partner-labs", PartnerLabViewSet, basename="partner-lab")

urlpatterns = router.urls
