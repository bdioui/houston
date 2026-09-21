from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from common.permissions import administers
from common.serializers import BaseModelSerializer, TenantRelatedField
from common.tenant import get_current_org
from directory.models import Member
from projects.models import Program

from .services import create_organization

from .models import Invitation, Organization, OrganizationMember, User
from projects.serializers import ProgramSerializer

class OrganizationSerializer(serializers.ModelSerializer):
    """Ce que le sélecteur a besoin de connaître d'un laboratoire, et rien de
    plus : il en affiche une liste, il n'en administre aucun."""

    class Meta:
        model = Organization
        fields = ["id", "name", "slug"]

class OrganizationMemberSerializer(serializers.ModelSerializer):
    """Un compte rattaché au laboratoire actif, vu par l'écran de partage.

    `role` est le seul champ modifiable, et c'est voulu : le rattachement ne
    s'écrit pas, il se gagne par invitation. Changer `user` reviendrait à
    donner la place de quelqu'un à un autre, changer `member` à lui donner sa
    fiche annuaire.

    L'identité est aplatie plutôt qu'imbriquée sous un objet `user` : l'écran
    affiche une ligne par personne, pas un arbre. `member_id` est rendu à côté
    parce que c'est la clé qui relie ce rattachement aux affectations de
    programme — l'écran de partage a besoin des deux pour dire qui, parmi les
    comptes du laboratoire, travaille sur le programme ouvert.

    `ModelSerializer` nu et non `BaseModelSerializer` : `OrganizationMember`
    n'est pas un `TenantModel`, il n'a ni `TenantRelatedField` à construire ni
    contrainte d'unicité cloisonnée à traduire.
    """

    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)

    class Meta:
        model = OrganizationMember
        # `is_owner` est le seul champ inscriptible : c'est la transmission de
        # la propriété. Tout le reste décrit une identité, qui ne se corrige pas
        # depuis l'écran de partage.
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "member_id",
            "is_owner",
            "created_at",
        ]
        read_only_fields = ["member_id", "created_at"]


class OrganizationTreeSerializer(OrganizationSerializer):
    """Le laboratoire *et* les programmes que l'utilisateur y suit.

    Réservé à la liste, parce que c'est elle qui alimente le menu de sélection :
    sans les programmes, choisir un laboratoire puis un programme demanderait
    deux écrans successifs et un aller-retour entre les deux.

    `me()`, `select()` et `create()` gardent `OrganizationSerializer` — ils
    décrivent un laboratoire déjà choisi, dont les programmes se demandent à
    `/api/programs/`.

    Le regroupement n'est pas calculé ici mais posé dans le contexte par la
    vue : `get_programs` étant appelée une fois par laboratoire, l'interroger
    ferait une requête par ligne. La vue en fait deux, une fois pour toutes.
    """

    programs = serializers.SerializerMethodField()

    class Meta(OrganizationSerializer.Meta):
        fields = OrganizationSerializer.Meta.fields + ["programs"]

    def get_programs(self, org):
        programs = self.context["programs_by_org"].get(org.id, [])
        return ProgramSerializer(programs, many=True).data


class OrganizationCreateSerializer(serializers.Serializer):
    """Créer un espace de travail depuis une session ouverte.

    Un seul champ, comme au signup : le programme qui naît avec le laboratoire
    porte un nom par défaut, posé par `create_organization`. Le demander ici
    reviendrait à faire expliquer les deux axes de cloisonnement à quelqu'un
    qui veut juste un espace à lui.
    """

    organization_name = serializers.CharField(max_length=200)


class SignupSerializer(serializers.Serializer):
    """Création d'un laboratoire et de son premier compte.

    Un `Serializer` nu et non un `ModelSerializer` : la requête ne décrit aucun
    modèle en particulier, elle en crée six d'un coup. Les champs sont ceux du
    formulaire, pas ceux d'une table.

    Le compte est le seul des six à naître ici ; les cinq autres sont l'affaire
    de `create_organization`, que la création d'espace en session ouverte
    appelle aussi. L'inscription n'est plus qu'une de ses deux portes : celle
    où il faut d'abord fabriquer le titulaire.

    L'inversion d'ordre qui en découle — le compte avant le laboratoire, alors
    que c'était l'inverse — est sans danger : `User` ne porte plus aucune clé
    vers l'organisation depuis que `User.organization` a cédé la place à
    `OrganizationMember`.

    `transaction.atomic` reste ici en plus de celui de `create_organization` :
    il couvre le compte *et* l'espace. Une moitié de chaîne laisserait un compte
    connecté et sans laboratoire, exactement l'état qu'on cherche à éviter.
    """

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=150, allow_blank=True, default="")
    last_name = serializers.CharField(max_length=150, allow_blank=True, default="")
    organization_name = serializers.CharField(max_length=200)

    def validate_email(self, value):
        email = User.objects.normalize_email(value)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "Un compte existe déjà pour cette adresse."
            )
        return email

    def validate(self, attrs):
        """Le mot de passe se valide ici et non dans un `validate_password`.

        `UserAttributeSimilarityValidator` compare le mot de passe aux autres
        champs du compte, qu'un validateur de champ ne voit pas. L'utilisateur
        construit ici n'est jamais sauvegardé : il ne sert qu'à porter l'email
        et le nom jusqu'au validateur.

        À noter, parce que ça ne va pas de soi : `create_user()` ne valide rien,
        il pose le mot de passe tel quel. Les AUTH_PASSWORD_VALIDATORS du
        settings ne se déclenchent que sur un appel explicite.
        """
        candidate = User(
            email=attrs["email"],
            first_name=attrs["first_name"],
            last_name=attrs["last_name"],
        )
        try:
            validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        user = User.objects.create_user(
                email=validated_data["email"],
                password=validated_data["password"],
                first_name=validated_data["first_name"],
                last_name=validated_data["last_name"],
            )
        create_organization(user=user, organization_name=validated_data["organization_name"])
        return user

class InvitationSerializer(BaseModelSerializer):
    """L'invitation vue par le laboratoire qui l'émet.

    `member_id` est un `TenantRelatedField` : son queryset est celui du
    laboratoire actif, donc désigner la fiche d'un autre laboratoire ressort en
    400 sans qu'aucune vérification n'ait à être écrite ici.

    `token` est en lecture seule et n'est rendu qu'une fois, à la création :
    sans envoi d'email, c'est l'invitant qui transporte le lien. Le relire dans
    la liste serait commode et ferait du jeton un secret partagé par tout le
    laboratoire.
    """

    member_id = TenantRelatedField(Member, source="member")
    # Obligatoire ici, alors que la colonne reste `null=True` : les invitations
    # déjà émises n'en ont pas, et une migration pour les en doter n'aurait
    # aucun programme à choisir. C'est donc une règle du formulaire, pas du
    # schéma — sans affectation, l'invité arrive sur un sélecteur de programme
    # vide, avec un compte rattaché au laboratoire et inutilisable.
    program_id = TenantRelatedField(
        Program, source="program", required=True, allow_null=False,
    )
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    invited_by_email = serializers.EmailField(source="invited_by.email", read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Invitation
        fields = [
            "id", "email", "member_id", "program_id", "first_name", "last_name",
            "is_program_admin", "organization_name", "invited_by_email",
            "created_at", "expires_at", "accepted_at", "is_expired",
        ]
        read_only_fields = ["created_at", "accepted_at"]

    def validate_email(self, value):
        return User.objects.normalize_email(value)

    def validate_member_id(self, value):
        """Une fiche déjà titulaire d'un compte n'est pas à donner.

        Le OneToOne l'interdirait de toute façon, mais à l'acceptation : des
        jours plus tard, à la figure de l'invité, pour une erreur commise par
        l'invitant. Autant refuser tout de suite.

        Nommée d'après le *champ* et non d'après sa source : DRF cherche
        `validate_<field_name>`, donc `validate_member_id`. L'appeler
        `validate_member` ne produit aucune erreur — la méthode n'est
        simplement jamais appelée, et la validation disparaît en silence.
        C'est le même piège nom/source que celui documenté sur
        `SourceAwareUniqueTogetherValidator` (`common/serializers.py:7`).
        """
        if value is not None and hasattr(value, "user_link"):
            raise serializers.ValidationError(
                "Cette fiche est déjà rattachée à un compte."
            )
        return value

    def validate_program_id(self, value):
        """On n'invite que vers un programme qu'on administre.

        C'est ici que se fait la vraie vérification, et non dans
        `IsProgramAdmin` : la permission ne voit que le programme *actif*, alors
        que l'invitation nomme le sien. Administrer A n'autorise pas à peupler
        B, même en gardant A ouvert.

        Le propriétaire passe partout, `administers` s'en charge.

        Même piège nom/source que `validate_member_id` : `validate_program_id`,
        jamais `validate_program`.
        """
        if not administers(self.context["request"], value):
            raise serializers.ValidationError(
                "Vous n'administrez pas ce programme."
            )
        return value

    def validate(self, attrs):
        """Inviter quelqu'un qui est déjà là n'a pas de sens, et le dire
        clairement évite un support inutile — l'invitant croirait le lien perdu
        alors que la personne a simplement à choisir son laboratoire."""
        email = attrs.get("email", getattr(self.instance, "email", None))
        organization = get_current_org()
        if OrganizationMember.objects.filter(
            organization=organization, user__email__iexact=email,
        ).exists():
            raise serializers.ValidationError(
                {"email": "Ce compte est déjà rattaché à ce laboratoire."}
            )
        return attrs


class InvitationPreviewSerializer(serializers.Serializer):
    """Ce qu'on montre à l'invité avant qu'il s'engage, et pas un mot de plus.

    Sert une route anonyme : quiconque tient le jeton voit cette réponse. D'où
    l'absence de tout ce qui renseignerait sur le laboratoire au-delà de son
    nom — ni effectif, ni liste de programmes, ni identité de l'invitant.

    `account_exists` n'est pas une fuite : l'invité connaît déjà sa propre
    adresse, et c'est ce qui permet au front d'afficher « connectez-vous »
    plutôt que « choisissez un mot de passe ».
    """

    organization_name = serializers.CharField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    account_exists = serializers.BooleanField()
    expires_at = serializers.DateTimeField()


class InvitationAcceptSerializer(serializers.Serializer):
    """Le formulaire d'acceptation, qui couvre trois situations d'un coup.

    Le mot de passe n'est requis que pour une session anonyme : il vaut
    création de compte si l'adresse est libre, authentification sinon. Un
    utilisateur déjà connecté n'a rien à saisir — on ne lui redemande pas un
    mot de passe qu'il vient de donner.
    """

    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=150, allow_blank=True, default="")
    last_name = serializers.CharField(max_length=150, allow_blank=True, default="")
