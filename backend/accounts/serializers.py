from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers

from common.serializers import BaseModelSerializer, TenantRelatedField
from common.tenant import get_current_org
from directory.models import Member
from projects.models import Program, ProgramMember

from .models import Invitation, Organization, OrganizationMember, User


class OrganizationSerializer(serializers.ModelSerializer):
    """Ce que le sélecteur a besoin de connaître d'un laboratoire, et rien de
    plus : il en affiche une liste, il n'en administre aucun."""

    class Meta:
        model = Organization
        fields = ["id", "name", "slug"]


def _unique_slug(name: str) -> str:
    base = slugify(name)[:40] or "laboratoire"
    slug, n = base, 2
    while Organization.objects.filter(slug=slug).exists():
        slug = f"{base}-{n}"
        n += 1
    return slug


class SignupSerializer(serializers.Serializer):
    """Création d'un laboratoire et de son premier compte.

    Un `Serializer` nu et non un `ModelSerializer` : la requête ne décrit aucun
    modèle en particulier, elle en crée six d'un coup. Les champs sont ceux du
    formulaire, pas ceux d'une table.

    Toute la chaîne s'exécute **hors contexte tenant** : TenantMiddleware sort
    avant de rien poser quand la requête est anonyme. D'où deux conséquences
    dans `create()` — les managers cloisonnés lèveraient, il faut passer par
    `all_tenants` avec un `organization=` explicite ; et aucune transaction
    n'est ouverte pour nous, il faut la prendre à la main.
    """

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=150, allow_blank=True, default="")
    last_name = serializers.CharField(max_length=150, allow_blank=True, default="")
    organization_name = serializers.CharField(max_length=200)
    program_name = serializers.CharField(max_length=200)
    program_pfi = serializers.CharField(max_length=50, allow_blank=True, default="")

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
        """L'ordre des six créations n'est pas libre : chacune attend la
        précédente. Et le tout est atomique parce qu'une moitié de chaîne est
        pire que rien — une organisation sans programme laisserait un compte
        connecté et inutilisable, exactement l'état qu'on cherche à éviter.
        """
        org = Organization.objects.create(
            name=validated_data["organization_name"],
            slug=_unique_slug(validated_data["organization_name"]),
        )
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
        )
        member = Member.all_tenants.create(
            organization=org,
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            email=user.email,
            is_staff=True,
        )
        # Les deux maillons qu'il ne faut pas manquer. OrganizationMember
        # rattache le compte au laboratoire *et* y désigne sa fiche : sans lui
        # le compte naîtrait sans aucune appartenance, donc sans contexte, donc
        # en 403 sur tout. Et c'est ProgramMember, plus bas, qui porte
        # l'affectation — il pointe vers Member, jamais vers User.
        # `admin` : le fondateur est le seul compte du laboratoire, quelqu'un
        # doit pouvoir y inviter les suivants. C'est aussi le seul endroit du
        # code où un rôle se pose sans qu'un administrateur l'ait décidé.
        OrganizationMember.objects.create(
            user=user, organization=org, member=member, role="admin",
        )

        program = Program.all_tenants.create(
            organization=org,
            name=validated_data["program_name"],
            pfi=validated_data["program_pfi"],
        )
        ProgramMember.all_tenants.create(
            organization=org,
            member=member,
            program=program,
            role="Coordination",
        )
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
            "role", "organization_name", "invited_by_email", "created_at",
            "expires_at", "accepted_at", "is_expired",
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
