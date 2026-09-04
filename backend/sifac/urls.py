from rest_framework.routers import DefaultRouter

from .views import SifacLineViewSet

router = DefaultRouter()
router.register("sifac-lines", SifacLineViewSet, basename="sifac-line")

urlpatterns = router.urls
