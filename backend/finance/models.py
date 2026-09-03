from django.db import models

from common.models import TenantModel


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
