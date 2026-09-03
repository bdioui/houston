from django.contrib.auth import authenticate
from django.contrib.auth import login as django_login
from django.contrib.auth import logout as django_logout
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


def _serialize(user):
    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "organization_id": user.organization_id,
    }


@method_decorator(ensure_csrf_cookie, name="dispatch")
class MeView(APIView):
    """Point d'amorçage, appelé au démarrage du front.

    Il rend deux services d'un coup : il pose le cookie csrftoken (sans lui, la
    première écriture — y compris le POST de connexion — part sans jeton et se
    prend un 403), et il dit si une session est déjà ouverte.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"authenticated": False})
        return Response({"authenticated": True, "user": _serialize(request.user)})


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    """csrf_protect est indispensable ici, et ne va pas de soi.

    Les vues DRF sont csrf_exempt : le contrôle CSRF est délégué à
    SessionAuthentication, qui ne l'applique qu'aux requêtes déjà
    authentifiées. Une connexion part donc sans session, donc sans contrôle —
    et reste ouverte au « login CSRF », où un attaquant connecte la victime sur
    *son* compte à lui pour observer ce qu'elle y saisit.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        user = authenticate(
            request,
            username=request.data.get("email", ""),
            password=request.data.get("password", ""),
        )
        if user is None:
            return Response(
                {"detail": "Identifiants invalides."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # login() appelle rotate_token() : le csrftoken change ici. Le front doit
        # relire le cookie à chaque requête plutôt que de le mémoriser — c'est
        # ce que fait client.ts.
        django_login(request, user)
        return Response({"authenticated": True, "user": _serialize(user)})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        django_logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)
