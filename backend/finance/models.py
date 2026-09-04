from django.db import models

from common.models import TenantModel
from directory.models import Member, Partner
from projects.models import Axis, Project


class Supplier(TenantModel):
    """Fiche fournisseur, propre à chaque laboratoire.

    Le tiers désigné est bien une entité juridique universelle, mais cette fiche
    ne l'est pas : le nom est saisi à la main, la description est une note
    interne, et l'import SIFAC en crée d'autorité dès qu'il croise un code
    inconnu. Partager la table ferait écrire chaque labo chez les autres.
    """

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    siret = models.CharField(max_length=20, blank=True, default="")
    # Clé de rapprochement de l'import SIFAC. Vide pour les écritures de paie,
    # qui ne portent aucun tiers — d'où la contrainte partielle ci-dessous.
    sifac_code = models.CharField(max_length=50, blank=True, default="")

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "sifac_code"],
                condition=models.Q(sifac_code__gt=""),
                name="uniq_supplier_sifac_code_per_org",
            )
        ]

    def __str__(self):
        return self.name


class BudgetCategory(TenantModel):
    """Grande masse budgétaire. Rattachée à un partenaire quand la masse lui est
    propre, nulle quand elle vaut pour tout le programme."""

    partner = models.ForeignKey(
        Partner, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="budget_categories",
    )
    title = models.CharField(max_length=255)

    class Meta:
        ordering = ["title"]
        verbose_name_plural = "budget categories"

    def __str__(self):
        return self.title


class BudgetDetail(TenantModel):
    """Ligne budgétaire, arborescente via `parent`."""

    budget_category = models.ForeignKey(
        BudgetCategory, on_delete=models.CASCADE, related_name="details",
    )
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True,
        related_name="children",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    budget = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["title"]

    def __str__(self):
        return self.title


class FinancialAgreement(TenantModel):
    # `SET_NULL` et non `CASCADE` : une convention est un engagement contractuel
    # signé avec un partenaire, pas un détail du projet. Supprimer le projet doit
    # rompre le rattachement, pas détruire la pièce — ni ses membres, ni ses
    # dépenses, ni ses actions, qui cascadaient tous derrière elle.
    #
    # La colonne est donc nullable en base, mais le sérialiseur continue
    # d'exiger un projet à la création : `null=True` décrit ce que la base
    # tolère après coup, pas ce que le client a le droit d'envoyer.
    project = models.ForeignKey(
        Project, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="agreements",
    )
    partner = models.ForeignKey(
        Partner, on_delete=models.CASCADE, related_name="agreements",
    )
    axis = models.ForeignKey(
        Axis, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="agreements",
    )
    status = models.ForeignKey(
        "common.Status", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="agreements",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    budget = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    # Part subventionnée du budget. `grant` est un mot réservé en SQL, mais
    # Django cite systématiquement ses identifiants : pas de conflit.
    grant = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    signed_date = models.DateField(null=True, blank=True)
    budget_detail = models.ForeignKey(
        BudgetDetail, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="agreements",
    )

    class Meta:
        ordering = ["-signed_date", "title"]

    def __str__(self):
        return self.title


class AgreementMember(TenantModel):
    member = models.ForeignKey(
        Member, on_delete=models.CASCADE, related_name="agreement_links",
    )
    agreement = models.ForeignKey(
        FinancialAgreement, on_delete=models.CASCADE, related_name="member_links",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["agreement", "member"], name="uniq_agreement_member"
            )
        ]


class Expanse(TenantModel):
    """Dépense. Le nom porte une faute figée par l'usage : la renommer suppose
    de renommer aussi le champ côté front (`src/lib/types.ts:389`).

    Une ligne par flux SIFAC quand `source='sifac'`, une par saisie manuelle
    sinon. Les champs réécrits à chaque import sont listés dans
    `SIFAC_OWNED_FIELDS` ; le reste — projet, ligne budgétaire, convention —
    est le tri fait à la main et doit survivre au réimport.
    """

    SOURCE_CHOICES = [("sifac", "SIFAC"), ("manual", "Saisie manuelle")]

    title = models.CharField(max_length=255, blank=True, default="")
    description = models.TextField(blank=True, default="")
    # Texte libre venu de SIFAC (FG/IG/MS), pas une clé étrangère.
    category = models.CharField(max_length=100, blank=True, default="")
    label = models.CharField(max_length=255, blank=True, default="")
    budget_detail = models.ForeignKey(
        BudgetDetail, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="expanses",
    )
    supplier = models.ForeignKey(
        Supplier, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="expanses",
    )
    project = models.ForeignKey(
        Project, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="expanses",
    )
    agreement = models.ForeignKey(
        FinancialAgreement, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="expanses",
    )
    purchase_date = models.DateField(null=True, blank=True)
    delivery_date = models.DateField(null=True, blank=True)
    payment_date = models.DateField(null=True, blank=True)
    invoice_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=100, blank=True, default="")
    # Clé de rapprochement de l'import. Nul — et non vide — pour une saisie
    # manuelle : reconcile.ts teste `e.flux_id === null` (src/lib/sifac/reconcile.ts:83).
    flux_id = models.CharField(max_length=50, null=True, blank=True, db_index=True)
    source = models.CharField(
        max_length=10, choices=SOURCE_CHOICES, default="manual"
    )
    amount_engaged = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    amount_invoiced = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ["-purchase_date", "title"]
        constraints = [
            # Le rapprochement se fait sur le flux seul, jamais sur le couple
            # (flux, exercice) : une commande reportée doit retomber sur la même
            # dépense. Contrainte partielle car flux_id est nul en saisie manuelle.
            models.UniqueConstraint(
                fields=["organization", "flux_id"],
                condition=models.Q(flux_id__isnull=False),
                name="uniq_expanse_flux_per_org",
            )
        ]

    def __str__(self):
        return self.title
