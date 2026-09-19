"""Routes de collection de `accounts`, montées sous `/api/`.

Séparées de `accounts.urls`, qui vit sous `/api/auth/` : les organisations sont
une collection comme les autres pour le client, elles n'ont rien à faire dans
l'espace de noms de l'authentification.
"""

from rest_framework.routers import DefaultRouter

from .views import InvitationViewSet, OrganizationViewSet

router = DefaultRouter()
router.register("organizations", OrganizationViewSet, basename="organization")
# Émettre et révoquer, côté laboratoire — donc cloisonné comme le reste.
# *Accepter* vit sous `/api/auth/` : c'est un geste d'authentification, qui
# ouvre une session et parfois crée un compte, et qui se fait sans contexte.
router.register("invitations", InvitationViewSet, basename="invitation")

urlpatterns = router.urls
