from django.contrib.auth import authenticate
from django.contrib.auth import login as django_login
from django.contrib.auth import logout as django_logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.http import Http404
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsOrganizationAdmin
from common.tenant import ORG_SESSION_KEY, PROGRAM_SESSION_KEY, get_current_org, get_current_program
from common.views import TenantViewSet
from directory.models import Member
from projects.models import ProgramMember
from projects.serializers import ProgramSerializer

from .models import Invitation, Organization, OrganizationMember, User
from .serializers import (
    InvitationAcceptSerializer,
    InvitationPreviewSerializer,
    InvitationSerializer,
    OrganizationSerializer,
    SignupSerializer,
)


def _serialize(user):
    """L'identité, et rien qu'elle.

    Ni laboratoire ni fiche annuaire : ils ne sont plus des propriétés du
    compte mais du contexte choisi pour la session, et un compte qui en a deux
    n'a pas de réponse unique à donner. MeView les rend à côté, pas dedans.
    """
    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
    }


@method_decorator(ensure_csrf_cookie, name="dispatch")
class MeView(APIView):
    """Point d'amorçage, appelé au démarrage du front.

    Il rend quatre services d'un coup : il pose le cookie csrftoken (sans lui,
    la première écriture — y compris le POST de connexion — part sans jeton et
    se prend un 403), il dit si une session est déjà ouverte, et il rend les
    deux contextes actifs, laboratoire et programme.

    Ces deux-là ne sont pas un agrément : c'est la seule façon pour le front de
    savoir, au démarrage, lequel des deux sélecteurs il doit ouvrir. Sans eux il
    ne l'apprendrait qu'en tapant une collection cloisonnée et en récoltant un
    409, c'est-à-dire en se servant d'une erreur comme d'un aiguillage.

    `member_id` est rendu à côté de l'utilisateur et non dedans : la fiche
    annuaire dépend du laboratoire actif, la même personne en ayant une par
    organisation. Sans lui le front ne saurait pas laquelle est la sienne — les
    deux tables ont des séquences indépendantes, et rien ne garantit qu'elles
    coïncident.

    `org_role` suit la même logique que `member_id` : il vaut pour le
    laboratoire actif et bascule avec lui. Il ne sert qu'à décider d'afficher
    ou non l'entrée « Inviter » — l'autorisation, elle, est refaite à chaque
    requête par `IsOrganizationAdmin`. Un front qui mentirait n'obtiendrait
    qu'un 403.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"authenticated": False})
        org = get_current_org()
        program = get_current_program()
        return Response(
            {
                "authenticated": True,
                "user": _serialize(request.user),
                "organization": OrganizationSerializer(org).data if org else None,
                "member_id": request.member.id if request.member else None,
                "org_role": getattr(request, "org_role", None),
                "program": ProgramSerializer(program).data if program else None,
            }
        )


class OrganizationViewSet(viewsets.ReadOnlyModelViewSet):
    """Le sélecteur de laboratoire, et la seule vue qui doive rester joignable
    quand aucun n'est actif.

    En lecture seule : créer un laboratoire depuis l'application supposerait de
    dire qui a le droit de le faire, et cette notion de rôle n'existe pas encore.
    L'inscription reste donc le seul chemin de création, et les invitations
    seront le seul chemin d'adhésion.

    Ni TenantViewSet ni queryset cloisonné : `Organization` est la table qui
    porte le découpage, la filtrer par le tenant courant serait circulaire. Le
    garde-fou est ici, et il est le même que pour les programmes — la liste est
    réduite aux rattachements de l'utilisateur, donc l'identifiant d'un
    laboratoire voisin ressort en 404 au lieu d'être écrit en session.
    """

    serializer_class = OrganizationSerializer

    def get_queryset(self):
        return Organization.objects.filter(user_links__user=self.request.user)

    @action(detail=True, methods=["post"])
    def select(self, request, pk=None):
        """Pose le laboratoire actif, et *efface* le programme.

        L'effacement n'est pas une précaution, c'est une correction : le
        programme en session appartient au laboratoire qu'on quitte. Le
        middleware finirait par le purger, ne le retrouvant pas parmi les
        affectations de la nouvelle fiche — mais compter là-dessus reviendrait à
        se reposer sur un nettoyage d'erreur pour tenir une invariante.

        Comme pour les programmes, la sélection ne vaut qu'à partir de la
        requête suivante : TenantMiddleware a résolu le contexte avant d'entrer
        ici.
        """
        org = self.get_object()
        request.session[ORG_SESSION_KEY] = org.id
        request.session.pop(PROGRAM_SESSION_KEY, None)
        return Response(self.get_serializer(org).data)


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


@method_decorator(csrf_protect, name="dispatch")
class SignupView(APIView):
    """Création d'un laboratoire, en libre-service.

    `csrf_protect` pour la même raison que LoginView : les vues DRF sont
    csrf_exempt et délèguent le contrôle à SessionAuthentication, qui ne
    l'applique qu'aux requêtes déjà authentifiées. Une inscription n'en est pas
    une, elle passerait donc sans contrôle.

    La session est ouverte dans la foulée : demander à l'inscrit de se
    reconnecter juste après avoir choisi son mot de passe n'apporte rien.

    Ni le laboratoire ni le programme ne sont dans la réponse, et ils ne peuvent
    pas y être : TenantMiddleware a résolu le contexte avant d'entrer ici, donc
    avant que le compte existe. Tous deux seront auto-sélectionnés à la requête
    suivante — un nouveau compte n'a qu'un rattachement et qu'une affectation,
    donc rien à choisir — et c'est le fetchMe() du front qui l'apprendra.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        django_login(request, user)
        return Response(
            {"authenticated": True, "user": _serialize(user)},
            status=status.HTTP_201_CREATED,
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        django_logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class InvitationViewSet(TenantViewSet):
    """Les invitations émises par le laboratoire actif.

    `TenantViewSet` pose `organization` à la création, comme pour toute
    collection cloisonnée. `IsOrganizationAdmin` s'y ajoute parce que c'est le
    seul geste de l'application qui déborde du laboratoire : il fabrique un
    droit d'entrée.

    Ni PUT ni PATCH : modifier une invitation partie n'a pas de sens, le lien
    est déjà chez quelqu'un. On révoque (DELETE) et on réinvite.
    """

    serializer_class = InvitationSerializer
    permission_classes = [IsAuthenticated, IsOrganizationAdmin]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return Invitation.objects.select_related(
            "organization", "invited_by", "member", "program"
        )

    def get_create_kwargs(self):
        return {**super().get_create_kwargs(), "invited_by": self.request.user}

    def create(self, request, *args, **kwargs):
        """Rend le lien d'acceptation, et c'est le seul moment où il sort.

        Sans envoi d'email, c'est l'invitant qui transporte le jeton : s'il ne
        le voyait pas ici, l'invitation serait créée et inutilisable. Le relire
        plus tard supposerait de le montrer dans la liste, donc à tout le
        laboratoire, donc d'en faire autre chose qu'un secret.
        """
        response = super().create(request, *args, **kwargs)
        invitation = self.get_queryset().get(pk=response.data["id"])
        response.data["token"] = invitation.token
        response.data["accept_url"] = request.build_absolute_uri(
            f"/invitation/{invitation.token}"
        )
        return response


class InvitationExpired(APIException):
    status_code = status.HTTP_410_GONE
    default_detail = "Cette invitation a expiré. Demandez-en une nouvelle."
    default_code = "invitation_expired"


def _pending_invitation(token):
    """Retrouve une invitation vivante, ou lève la réponse qui convient.

    `all_tenants` et non `objects`, seul endroit du projet où l'échappatoire
    sert une requête HTTP : l'invité n'a pas de contexte, c'est justement ce
    qu'il vient chercher. Ce n'est pas une brèche — on ne balaie pas une table
    cloisonnée, on suit un secret de 32 octets jusqu'à la seule ligne qu'il
    désigne, et cette ligne porte son organisation.
    """
    invitation = (
        Invitation.all_tenants.select_related("organization", "member", "program")
        .filter(token=token, accepted_at__isnull=True)
        .first()
    )
    if invitation is None:
        # 404 et non 403 : confirmer qu'un jeton a existé renseignerait un
        # visiteur qui n'a rien à savoir. Vaut aussi pour une invitation déjà
        # acceptée — elle n'est plus une porte.
        raise Http404
    if invitation.is_expired:
        # 410 plutôt que 404 : le lien a existé, il est périmé, et c'est une
        # information utile — elle dit à l'invité de réclamer un nouveau lien
        # plutôt que de croire à une faute de frappe.
        raise InvitationExpired
    return invitation


@method_decorator(ensure_csrf_cookie, name="dispatch")
class InvitationDetailView(APIView):
    """Ce que l'invité voit avant de s'engager.

    Anonyme par nécessité : la personne invitée n'a pas forcément de compte, et
    lui demander de se connecter d'abord pour lui dire ensuite à quoi elle est
    invitée serait à l'envers.

    `ensure_csrf_cookie` pour la raison qui vaut sur MeView : l'acceptation qui
    suit est protégée par `csrf_protect`, et sans ce GET le cookie csrftoken
    n'existe pas. La page d'invitation est le seul écran que l'on puisse
    atteindre par un lien direct, sans être passé par l'amorçage du front — il
    faut donc qu'elle se suffise.
    """

    permission_classes = [AllowAny]

    def get(self, request, token):
        invitation = _pending_invitation(token)
        member = invitation.member
        return Response(
            InvitationPreviewSerializer(
                {
                    "organization_name": invitation.organization.name,
                    "email": invitation.email,
                    "first_name": member.first_name if member else invitation.first_name,
                    "last_name": member.last_name if member else invitation.last_name,
                    "account_exists": User.objects.filter(
                        email__iexact=invitation.email
                    ).exists(),
                    "expires_at": invitation.expires_at,
                }
            ).data
        )


@method_decorator(csrf_protect, name="dispatch")
class InvitationAcceptView(APIView):
    """L'acceptation, qui couvre trois situations sous une seule route.

    `csrf_protect` pour la raison de LoginView et SignupView : les vues DRF
    sont csrf_exempt et délèguent le contrôle à SessionAuthentication, qui ne
    l'applique qu'aux requêtes déjà authentifiées. Celle-ci ne l'est pas
    toujours, et elle ouvre une session.

    Les trois cas, et ce qui les distingue :

    1. Session ouverte — on rattache le compte connecté, sans rien demander.
       L'email doit correspondre : une invitation est nominative, et l'accepter
       depuis un autre compte la détournerait.
    2. Compte existant, non connecté — le mot de passe vaut authentification.
       On ne crée rien, on rattache.
    3. Aucun compte — le mot de passe vaut création. C'est le seul chemin, avec
       l'inscription, qui fabrique un User.
    """

    permission_classes = [AllowAny]

    def post(self, request, token):
        invitation = _pending_invitation(token)
        serializer = InvitationAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user, created = self._resolve_user(request, invitation, data)
        if isinstance(user, Response):
            return user

        with transaction.atomic():
            link = self._attach(invitation, user, data)

        if not request.user.is_authenticated:
            django_login(request, user)

        # Atterrir dans le laboratoire qu'on vient de rejoindre, plutôt que sur
        # un sélecteur. Pour un compte qui en avait déjà un, c'est une bascule
        # de contexte — d'où la purge du programme, comme dans `select`.
        request.session[ORG_SESSION_KEY] = invitation.organization_id
        request.session.pop(PROGRAM_SESSION_KEY, None)

        return Response(
            {
                "authenticated": True,
                "user": _serialize(user),
                "organization": OrganizationSerializer(invitation.organization).data,
                "member_id": link.member_id,
                "created_account": created,
            },
            status=status.HTTP_201_CREATED,
        )

    def _resolve_user(self, request, invitation, data):
        """Rend (user, compte_créé), ou une Response d'erreur."""
        if request.user.is_authenticated:
            if request.user.email.lower() != invitation.email.lower():
                return (
                    Response(
                        {
                            "detail": "Cette invitation vise une autre adresse. "
                            "Déconnectez-vous pour l'accepter.",
                            "code": "invitation_email_mismatch",
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    ),
                    False,
                )
            return request.user, False

        password = data.get("password") or ""
        if not password:
            return (
                Response(
                    {"password": ["Ce champ est obligatoire."]},
                    status=status.HTTP_400_BAD_REQUEST,
                ),
                False,
            )

        existing = User.objects.filter(email__iexact=invitation.email).first()
        if existing is not None:
            user = authenticate(request, username=existing.email, password=password)
            if user is None:
                return (
                    Response(
                        {"detail": "Identifiants invalides."},
                        status=status.HTTP_401_UNAUTHORIZED,
                    ),
                    False,
                )
            return user, False

        candidate = User(
            email=invitation.email,
            first_name=data["first_name"],
            last_name=data["last_name"],
        )
        try:
            validate_password(password, user=candidate)
        except DjangoValidationError as exc:
            return (
                Response(
                    {"password": list(exc.messages)},
                    status=status.HTTP_400_BAD_REQUEST,
                ),
                False,
            )
        user = User.objects.create_user(
            email=invitation.email,
            password=password,
            first_name=data["first_name"],
            last_name=data["last_name"],
        )
        return user, True

    def _attach(self, invitation, user, data):
        """Pose les deux rattachements et consomme l'invitation.

        Tout passe par `all_tenants` : on écrit dans le laboratoire de
        l'invitation, pas dans un contexte actif — il n'y en a pas, et s'il y en
        avait un ce serait celui du laboratoire *précédent* de l'invité.
        """
        org = invitation.organization
        member = invitation.member
        if member is None:
            member = Member.all_tenants.create(
                organization=org,
                first_name=data["first_name"] or invitation.first_name,
                last_name=data["last_name"] or invitation.last_name,
                email=invitation.email,
                is_staff=True,
            )
        elif hasattr(member, "user_link"):
            # Réclamée entre l'émission et l'acceptation. Le OneToOne le dirait
            # aussi, par une IntegrityError en 500 : autant le dire proprement.
            raise ValidationError(
                {"detail": "Cette fiche a été rattachée à un autre compte entre-temps."}
            )

        link, _ = OrganizationMember.objects.get_or_create(
            user=user,
            organization=org,
            defaults={"member": member, "role": invitation.role},
        )

        if invitation.program_id is not None:
            ProgramMember.all_tenants.get_or_create(
                organization=org,
                member=member,
                program_id=invitation.program_id,
                defaults={"role": "Membre"},
            )

        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=["accepted_at"])
        return link
