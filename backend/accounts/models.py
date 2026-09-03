from django.contrib.auth.models import AbstractUser, UserManager as DjangoUserManager
from django.db import models


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
    """Compte de connexion.

    Distinct de directory.Member, qui viendra au chantier suivant : beaucoup de
    membres (contacts de partenaires) n'ont pas de compte, et certains comptes
    (support) n'ont pas de fiche membre.
    """

    username = None  # remplacé par l'email
    email = models.EmailField(unique=True)

    organization = models.ForeignKey(
        Organization,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="users",
        help_text="Nul pour un compte de support, qui n'appartient à aucun labo.",
    )

    member = models.OneToOneField(
        "directory.Member",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="user",
        help_text="Fiche annuaire du titulaire. Nulle pour un compte de support.",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self) -> str:
        return self.email
