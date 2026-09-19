from django.urls import path

from .views import (
    InvitationAcceptView,
    InvitationDetailView,
    LoginView,
    LogoutView,
    MeView,
    SignupView,
)

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("signup/", SignupView.as_view(), name="signup"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    # Sous `/api/auth/` et non sous `/api/invitations/` : ces deux routes se
    # servent sans contexte et souvent sans compte, au même titre que login et
    # signup. Le jeton tient lieu d'identifiant — on ne peut pas proposer un
    # `pk` à quelqu'un qui ne voit encore aucune collection.
    path(
        "invitations/<str:token>/",
        InvitationDetailView.as_view(),
        name="invitation-detail",
    ),
    path(
        "invitations/<str:token>/accept/",
        InvitationAcceptView.as_view(),
        name="invitation-accept",
    ),
]
