from django.db import models

from common.models import TenantModel


class Lab(TenantModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    type = models.CharField(max_length=100, blank=True, default="")
    topic = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Partner(TenantModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    color = models.CharField(max_length=32, blank=True, default="")
    logo = models.TextField(blank=True, default="")
    type = models.CharField(max_length=100, blank=True, default="")
    consortium = models.BooleanField(default=False)
    status = models.ForeignKey(
        "common.Status", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="partners",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Member(TenantModel):
    """Fiche annuaire, distincte du compte de connexion accounts.User.

    Toutes les fiches ne sont pas des comptes : celles qui portent un `partner`
    sont des contacts chez un partenaire, qui ne se connecteront jamais et dont
    l'email est souvent vide ou partagé — deux choses que User.email, unique et
    servant d'identifiant, ne tolère pas.
    """

    partner = models.ForeignKey(
        Partner, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="members",
    )
    lab = models.ForeignKey(
        Lab, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="members",
    )
    first_name = models.CharField(max_length=150, blank=True, default="")
    last_name = models.CharField(max_length=150, blank=True, default="")
    position = models.CharField(max_length=255, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    tel = models.CharField(max_length=50, blank=True, default="")
    genre = models.CharField(max_length=50, blank=True, default="")
    status = models.CharField(max_length=100, blank=True, default="")
    profile_image = models.TextField(blank=True, default="")
    # « Personnel du laboratoire », par opposition à un contact externe. Rien à
    # voir avec User.is_staff, qui ouvre l'admin Django.
    is_staff = models.BooleanField(default=False)

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email


class PartnerLab(TenantModel):
    lab = models.ForeignKey(
        Lab, 
        on_delete=models.CASCADE, 
        related_name='partner_links'
        )
    partner = models.ForeignKey(
        Partner, 
        on_delete=models.CASCADE, 
        related_name='lab_links'
        )

    class Meta:
            constraints = [
                models.UniqueConstraint(fields=["partner", "lab"], name="uniq_lab_partner")
            ]

class Formation(TenantModel): 
    code = models.CharField(max_length=30, blank=True, default="")
    type = models.CharField(max_length=40, blank=True, default="")
    title = models.CharField(max_length=200, blank=True, default="")
    partner = models.ForeignKey(
        Partner, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="formations",
    )
    level = models.CharField(max_length=200, blank=True, default="")
    degree_type = models.CharField(max_length=200, blank=True, default="")
    formacode = models.CharField(max_length=200, blank=True, default="")
    rome = models.CharField(max_length=200, blank=True, default="")
    nsf = models.CharField(max_length=200, blank=True, default="")
    status = models.CharField(max_length=200, blank=True, default="")
    expiry_date = models.DateField(null=True, blank=True)
    is_national= models.BooleanField(default=False)

    class Meta:
        ordering = ["type"]

 

