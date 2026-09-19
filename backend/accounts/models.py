import secrets
from datetime import timedelta

from django.contrib.auth.models import AbstractUser, UserManager as DjangoUserManager
from django.db import models
from django.utils import timezone

from common.models import TenantModel


class Organization(models.Model):
    """Le tenant. Un laboratoire, un client.

    N'hérite pas de TenantModel : c'est la table qui porte le découpage, elle ne
    peut pas être découpée par elle-même.
    """

    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.name


class UserManager(DjangoUserManager):
    """L'identifiant est l'email, pas un pseudo : create_user() de Django
    attend un `username` positionnel, il faut donc réécrire les deux entrées."""

    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError("Un email est requis.")
        user = self.model(email=self.normalize_email(email), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra)


class User(AbstractUser):
    """Compte de connexion, et rien d'autre.

    Il ne porte aucun laboratoire : l'appartenance vit dans OrganizationMember,
    parce qu'elle est multiple. Un compte est une identité, pas une place.

    Distinct de directory.Member : beaucoup de membres (contacts de partenaires)
    n'ont pas de compte, et certains comptes (support) n'ont pas de fiche.
    """

    username = None  # remplacé par l'email
    email = models.EmailField(unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self) -> str:
        return self.email


class OrganizationMember(models.Model):
    """L'appartenance d'un compte à un laboratoire.

    Remplace l'ancienne paire `User.organization` / `User.member`, qui figeait
    une personne dans un seul laboratoire. Une même adresse peut désormais
    travailler pour plusieurs — double affectation, unité mixte, prestataire —
    sans avoir à ouvrir un second compte, ce que `User.email` unique interdit
    de toute façon.

    N'hérite pas de TenantModel, et ne peut pas : c'est la table qui *établit*
    le rattachement, la consulter suppose donc de ne pas encore l'avoir résolu.
    TenantMiddleware la lit hors contexte, avant de poser quoi que ce soit.

    `member` est ici et non sur User parce qu'une fiche annuaire appartient à un
    laboratoire : la même personne en a une par organisation, avec un poste et
    des groupes différents dans chacune. Nulle pour un compte de support, qui
    accède sans figurer à l'annuaire.
    """

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="org_links",
    )
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="user_links",
    )
    member = models.OneToOneField(
        "directory.Member",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="user_link",
    )
    # Le premier droit de l'application, et volontairement le seul. Il porte une
    # question unique : qui peut agrandir le laboratoire ? Tout le reste — lire,
    # écrire, supprimer — dépend du cloisonnement, pas d'un grade.
    #
    # Sur le rattachement et non sur User, pour la même raison que `member` :
    # administrer son propre laboratoire ne donne aucun titre dans un autre.
    role = models.CharField(
        max_length=20,
        choices=[("admin", "Administrateur"), ("member", "Membre")],
        default="member",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "organization"], name="uniq_user_per_organization",
            )
        ]
        ordering = ["organization__name"]

    def __str__(self) -> str:
        return f"{self.user.email} @ {self.organization.name}"


def _default_token() -> str:
    """32 octets d'entropie en base64url.

    `secrets` et non `random` : le jeton *est* l'autorisation d'entrer dans un
    laboratoire. Il voyage dans une URL, donc pas de caractère à échapper.
    """
    return secrets.token_urlsafe(32)


# Assez long pour survivre à des vacances, assez court pour qu'un lien oublié
# dans une boîte mail ne reste pas une porte ouverte indéfiniment.
INVITATION_VALIDITY_DAYS = 14


def _default_expiry():
    return timezone.now() + timedelta(days=INVITATION_VALIDITY_DAYS)


class Invitation(TenantModel):
    """Une place réservée dans un laboratoire, en attente d'être prise.

    TenantModel : une invitation appartient au laboratoire qui l'émet, et la
    lister est un geste cloisonné comme un autre. Mais l'accepter ne l'est pas
    — l'invité n'a par définition pas encore de contexte, et peut même ne pas
    avoir de compte. Le jeton se cherche donc avec `all_tenants`, seul endroit
    du projet où l'échappatoire sert une requête HTTP. Elle est sûre parce que
    le jeton porte lui-même l'organisation : on ne cherche pas dans un
    laboratoire, on suit un secret jusqu'au sien.

    `member` est la charnière avec l'annuaire. Renseigné, l'acceptation
    rattache la fiche déjà saisie — le collègue qu'on avait inscrit bien avant
    qu'il ait un compte. Nul, elle en crée une à partir des noms portés ici.
    Sans ce champ, inviter quelqu'un de déjà présent à l'annuaire produirait un
    doublon, et les affectations projet resteraient sur la fiche orpheline.
    """

    email = models.EmailField()
    member = models.ForeignKey(
        "directory.Member",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invitations",
    )
    # Servent à fabriquer la fiche annuaire si `member` est nul, et à afficher
    # un nom dans la liste des invitations en attente. Redondants avec la fiche
    # quand elle existe, et c'est sans conséquence : ils ne sont jamais relus
    # dans ce cas.
    first_name = models.CharField(max_length=150, blank=True, default="")
    last_name = models.CharField(max_length=150, blank=True, default="")
    # Sans lui, un invité arriverait dans le laboratoire sans aucune
    # affectation : le middleware ne résoudrait aucun programme, et le front
    # afficherait un sélecteur vide dont on ne peut pas sortir. Le rattachement
    # à l'organisation ne suffit donc pas à rendre un compte utilisable, il
    # faut les deux axes — c'est la conséquence directe du cloisonnement.
    #
    # Nul reste permis : inviter un administrateur qui répartira lui-même les
    # programmes est légitime. Le front doit alors dire « aucun programme »
    # plutôt que proposer un choix vide.
    program = models.ForeignKey(
        "projects.Program",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="invitations",
    )
    role = models.CharField(
        max_length=20,
        choices=[("admin", "Administrateur"), ("member", "Membre")],
        default="member",
    )
    invited_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_invitations",
    )
    token = models.CharField(max_length=64, unique=True, default=_default_token)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=_default_expiry)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            # Partielle : une seule invitation *vivante* par adresse et par
            # laboratoire, mais autant d'acceptées qu'il y a eu de passages —
            # elles restent comme trace. DRF ne sait pas construire de
            # validateur pour une contrainte à `condition`, c'est
            # `unique_violation_as_400` qui la rattrape en 400.
            models.UniqueConstraint(
                fields=["organization", "email"],
                condition=models.Q(accepted_at__isnull=True),
                name="uniq_pending_invitation_per_org",
            )
        ]
        ordering = ["-created_at"]

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    def __str__(self) -> str:
        return f"{self.email} → {self.organization.name}"
