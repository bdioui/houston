from rest_framework.routers import DefaultRouter

from .views import AxisViewSet, GroupViewSet, GroupMemberViewSet

router = DefaultRouter()
router.register("axes", AxisViewSet, basename="axis")
router.register("groups", GroupViewSet, basename="group")
router.register("group-members", GroupMemberViewSet, basename="group-member")

urlpatterns = router.urls