from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import SifacImportView, SifacLineViewSet, SifacPreviewView

router = DefaultRouter()
router.register("sifac-lines", SifacLineViewSet, basename="sifac-line")

# Les deux imports sont hors routeur : ce sont des actions, pas des ressources,
# et le routeur n'a pas de modèle à leur associer.
urlpatterns = [
    path("sifac/preview/", SifacPreviewView.as_view(), name="sifac-preview"),
    path("sifac/import/", SifacImportView.as_view(), name="sifac-import"),
    *router.urls,
]
