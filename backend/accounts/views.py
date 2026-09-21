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
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import (
    APIException,
    PermissionDenied,
    ValidationError,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .services import create_organization

from common.permissions import IsOrganizationOwner, IsProgramAdmin, administers
from common.tenant import (
    ORG_SESSION_KEY,
    PROGRAM_SESSION_KEY,
    TenantContextRequired,
    get_current_org,
    get_current_program,
)
from common.views import TenantViewSet
from directory.models import Member
from projects.models import ProgramMember
from projects.serializers import ProgramSerializer

from .models import Invitation, Organization, OrganizationMember, User
from .serializers import (
    InvitationAcceptSerializer,
    InvitationPreviewSerializer,
    InvitationSerializer,
    OrganizationMemberSerializer,
    OrganizationSerializer,
    SignupSerializer,
    OrganizationCreateSerializer,
    OrganizationTreeSerializer
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

    `is_owner` et `is_program_admin` suivent la même logique que `member_id` :
    ils valent pour les contextes actifs et basculent avec eux. Ils ne servent
    qu'à décider d'afficher ou non un bouton — « Partager », « Nouveau
    programme ». L'autorisation, elle, est refaite à chaque requête par
    `common.permissions` ; un front qui mentirait n'obtiendrait qu'un 403.

    Deux drapeaux et non un rôle, parce que les deux axes se cumulent sans se
    hiérarchiser : on peut administrer un programme sans avoir fondé le
    laboratoire, et le propriétaire est administrateur des siens par
    affectation, pas par dérogation.
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
                "is_owner": getattr(request, "is_owner", False),
                "is_program_admin": getattr(request, "is_program_admin", False),
                "program": ProgramSerializer(program).data if program else None,
            }
        )


class OrganizationViewSet(mixins.CreateModelMixin, viewsets.ReadOnlyModelViewSet):
    """Le sélecteur de laboratoire, et la seule vue qui doive rester joignable
    quand aucun n'est actif.

    Lecture, plus création. Pas de mise à jour ni de suppression : `mixins.
    CreateModelMixin` n'ouvre que le POST, là où `ModelViewSet` ouvrirait aussi
    PUT, PATCH et DELETE qu'il faudrait refermer à la main. Renommer ou
    supprimer un laboratoire relèvera de la vue d'administration, avec ses
    propres droits.

    Ni TenantViewSet ni queryset cloisonné : `Organization` est la table qui
    porte le découpage, la filtrer par le tenant courant serait circulaire. Le
    garde-fou est ici, et il est le même que pour les programmes — la liste est
    réduite aux rattachements de l'utilisateur, donc l'identifiant d'un
    laboratoire voisin ressort en 404 au lieu d'être écrit en session.

    Pas de `csrf_protect`, contrairement à SignupView et LoginView : celles-ci
    servent des requêtes anonymes, que SessionAuthentication laisse passer sans
    contrôle. Ici la session est exigée, donc le contrôle s'applique déjà.
    """

    def get_serializer_class(self):
        if self.action == "create":
            return OrganizationCreateSerializer
        if self.action == "list":
            return OrganizationTreeSerializer
        return OrganizationSerializer

    def get_queryset(self):
        return Organization.objects.filter(user_links__user=self.request.user)

    def get_serializer_context(self):
        """Pose dans le contexte les programmes de l'utilisateur, par laboratoire.

        Calculé ici et non dans le sérialiseur parce que `get_programs` est
        appelée une fois par ligne : l'y laisser ferait une requête par
        laboratoire, et deux en comptant la résolution de la fiche. Ici c'est
        deux, quel qu'en soit le nombre.

        `all_tenants` est le second endroit du projet où l'échappatoire sert une
        requête HTTP, après la résolution d'une invitation par son jeton. Il
        n'est pas employé pour balayer une table cloisonnée mais parce qu'on
        interroge *en travers* des laboratoires, ce qu'aucun contexte ne peut
        exprimer — le garde-fou automatique est remplacé par un plus étroit sur
        la ligne suivante : les fiches de cet utilisateur, et elles seules.

        L'ordre compte : partir de `OrganizationMember`, qui n'est pas
        cloisonné, et descendre vers les affectations. L'écrire dans l'autre
        sens — `Program.all_tenants.filter(...)` — donnerait le même résultat
        aujourd'hui et une fuite silencieuse le jour où quelqu'un élargit la
        clause.
        """
        context = super().get_serializer_context()
        if self.action != "list":
            return context

        member_ids = OrganizationMember.objects.filter(
            user=self.request.user
        ).values("member_id")
        # `select_related` : sans lui, le `link.program` de la boucle
        # déclencherait une requête par affectation, et l'optimisation
        # s'annulerait.
        # `order_by` : l'arbre ne sert plus seulement à remplir une liste, le
        # front y prend `programs[0]` quand aucun programme n'est en session.
        # Sans tri, ce premier élément est celui que Postgres rend ce jour-là,
        # et le laboratoire s'ouvrirait ailleurs d'un rechargement à l'autre.
        links = ProgramMember.all_tenants.filter(
            member_id__in=member_ids
        ).select_related("program").order_by("program__name")

        by_org = {}
        for link in links:
            by_org.setdefault(link.program.organization_id, []).append(link.program)
        context["programs_by_org"] = by_org
        return context

    def create(self, request, *args, **kwargs):
        """Créer un espace et y atterrir.

        `create()` et non `perform_create()` : il faut écrire la session et
        rendre l'organisation lue, deux choses que le hook ne permet pas.

        La purge de la clé programme n'est pas une précaution mais une
        correction, comme dans `select` : celle qui est en session désigne un
        programme du laboratoire qu'on quitte. Et comme pour toute sélection,
        rien de tout cela ne vaut avant la requête suivante — TenantMiddleware a
        résolu le contexte avant d'entrer ici. C'est le fetchMe() du front qui
        apprendra où l'on a atterri.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        org, _program = create_organization(
            user=request.user,
            organization_name=serializer.validated_data["organization_name"],
        )
        request.session[ORG_SESSION_KEY] = org.id
        request.session.pop(PROGRAM_SESSION_KEY, None)
        return Response(
            OrganizationSerializer(org).data, status=status.HTTP_201_CREATED,
        )

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


class OrganizationMemberViewSet(
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Les comptes déjà rattachés au laboratoire actif : qui est là, à quel titre.

    Lister, transmettre la propriété, retirer. Pas de création, et l'absence est
    le fond du sujet : on n'entre dans un laboratoire que par invitation.
    Rattacher directement supposerait de désigner un compte existant par son
    adresse, donc de confirmer à qui la devine qu'elle existe.

    Le PATCH ne porte que sur `is_owner`, et c'est le geste le plus lourd de
    l'application : il donne à quelqu'un d'autre ce qu'on détient. Il reste
    ouvert — sans lui, un propriétaire parti en emporterait le laboratoire, et
    plus personne ne pourrait y créer un programme ni y inviter qui que ce soit.

    Ni `TenantViewSet` ni queryset cloisonné automatique, pour la raison écrite
    sur le modèle : `OrganizationMember` est la table qui *établit* le
    rattachement, elle ne peut pas être filtrée par un contexte qu'elle sert à
    résoudre. `objects` est donc le manager ordinaire de Django, et le
    cloisonnement s'écrit ici, à la main.

    `IsOrganizationOwner` laisse la lecture à tout le laboratoire : savoir qui
    y travaille n'est un secret pour aucun de ses membres, et l'écran de
    partage doit rester consultable pour dire à qui s'adresser.
    """

    serializer_class = OrganizationMemberSerializer
    permission_classes = [IsAuthenticated, IsOrganizationOwner]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        org = get_current_org()
        if org is None:
            # La table n'étant pas cloisonnée, rien ne lèverait tout seul :
            # `filter(organization=None)` rendrait une liste vide, et l'écran
            # montrerait un laboratoire désert au lieu d'ouvrir le sélecteur.
            raise TenantContextRequired
        return OrganizationMember.objects.filter(organization=org).select_related("user")

    def _refuse_self(self, instance):
        """Un propriétaire ne se retire ni ne se dépossède lui-même.

        Deux conséquences sous une seule règle. La première est immédiate :
        `IsOrganizationOwner` relit `request.is_owner` à chaque requête, donc
        renoncer à la propriété referme l'écran sur son auteur, au milieu de
        son geste.

        La seconde est ce qui rend la règle suffisante. Elle garantit qu'il
        reste toujours un propriétaire — celui qui agit — sans avoir à compter
        les autres : tout laboratoire dont on retire un propriétaire en garde
        un, puisque seul un propriétaire peut faire ce retrait. Transmettre se
        fait donc en deux temps : nommer l'autre, puis se faire retirer par lui.
        """
        if instance.user_id == self.request.user.id:
            raise ValidationError(
                {
                    "detail": "Vous ne pouvez pas modifier votre propre rattachement. "
                    "Demandez-le à un autre propriétaire du laboratoire."
                }
            )

    def perform_update(self, serializer):
        self._refuse_self(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        """Retire l'accès, et rien d'autre.

        La fiche annuaire survit, ses affectations de programme aussi :
        `OrganizationMember.member` est un `SET_NULL` vu depuis `Member`, pas un
        `CASCADE`. C'est ce qu'il faut — la personne a écrit des actions, porté
        des projets, et cet historique appartient au laboratoire, pas à son
        compte. Ce qu'on lui retire, c'est la porte.

        La fiche redevient donc libre, et une invitation ultérieure pourra la
        reprendre telle quelle par son `member_id`.
        """
        self._refuse_self(instance)
        instance.delete()


class InvitationViewSet(TenantViewSet):
    """Les invitations émises par le laboratoire actif.

    `TenantViewSet` pose `organization` à la création, comme pour toute
    collection cloisonnée. `IsProgramAdmin` s'y ajoute parce que c'est le seul
    geste de l'application qui déborde du laboratoire : il fabrique un droit
    d'entrée.

    **L'arrivée se délègue, l'exclusion non.** Un administrateur de programme
    invite vers *le sien* — c'est lui qui sait de qui son équipe a besoin, et
    le faire passer par le propriétaire ferait de celui-ci un guichet. Retirer
    un compte du laboratoire, en revanche, reste au propriétaire seul
    (`OrganizationMemberViewSet`) : c'est un geste qui dépasse le programme
    depuis lequel on le poserait.

    La permission n'est qu'un premier filtre — elle ne sait pas quel programme
    la charge utile désigne. C'est `InvitationSerializer.validate_program_id`
    qui vérifie que l'invitant administre *celui-là*.

    Ni PUT ni PATCH : modifier une invitation partie n'a pas de sens, le lien
    est déjà chez quelqu'un. On révoque (DELETE) et on réinvite.
    """

    serializer_class = InvitationSerializer
    permission_classes = [IsAuthenticated, IsProgramAdmin]
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

    def perform_destroy(self, instance):
        """Révoquer suit la même règle qu'émettre, sur le programme visé.

        Sans cette vérification, la permission suffirait à laisser
        l'administrateur d'un programme annuler l'invitation d'un autre — un
        geste qu'il ne pourrait pas refaire.
        """
        if not administers(self.request, instance.program):
            raise PermissionDenied(
                "Cette invitation vise un programme que vous n'administrez pas."
            )
        instance.delete()


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

        # Pas de `is_owner` : une invitation ne fabrique jamais un propriétaire,
        # quel que soit le titre qu'elle accorde. Le défaut du champ suffit,
        # l'écrire ici laisserait croire qu'il aurait pu en être autrement.
        link, _ = OrganizationMember.objects.get_or_create(
            user=user, organization=org, defaults={"member": member},
        )

        if invitation.program_id is not None:
            # C'est ici, et nulle part ailleurs, que le titre porté par
            # l'invitation prend effet : il ne valait que pour ce programme-là.
            ProgramMember.all_tenants.get_or_create(
                organization=org,
                member=member,
                program_id=invitation.program_id,
                defaults={
                    "role": "Membre",
                    "is_admin": invitation.is_program_admin,
                },
            )

        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=["accepted_at"])
        return link
