from django.db import models

from common.models import TenantModel


class SifacLine(TenantModel):
    """Écriture brute d'un export SIFAC, telle que lue dans le XLSX.

    Table plate et sans clé étrangère : c'est une copie fidèle de la source,
    conservée pour que la vue « Ligne » de l'onglet Finance se recoupe avec un
    relevé SIFAC. L'agrégation par `flux_id` produit les `finance.Expanse` ;
    ces lignes-là ne sont jamais modifiées à la main, seulement remplacées en
    bloc par périmètre (pfi, exercice).
    """

    pfi = models.CharField(max_length=50, blank=True, default="")
    # Métadonnée d'import choisie à la validation, PAS une date du fichier.
    exercice = models.IntegerField(default=0)
    # La clé de regroupement. Les lignes sans numéro de flux sont des
    # sous-totaux et sont écartées au parsing, jamais insérées ici.
    flux_id = models.CharField(max_length=50, blank=True, default="")
    flux_label = models.CharField(max_length=255, blank=True, default="")
    # COMMANDE/FACTURE, ECRITURE DE PAIE, ...
    rubrique = models.CharField(max_length=100, blank=True, default="")
    supplier_name = models.CharField(max_length=255, blank=True, default="")
    supplier_code = models.CharField(max_length=50, blank=True, default="")
    account = models.CharField(max_length=50, blank=True, default="")
    account_label = models.CharField(max_length=255, blank=True, default="")
    engagement_date = models.DateField(null=True, blank=True)
    # Date de livraison service fait.
    csf_date = models.DateField(null=True, blank=True)
    amount_engaged = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    amount_certified = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    amount_received = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    invoice_number = models.CharField(max_length=50, blank=True, default="")
    invoice_date = models.DateField(null=True, blank=True)
    invoice_text = models.TextField(blank=True, default="")
    amount_invoiced = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    payment_date = models.DateField(null=True, blank=True)
    amount_report = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    # Élément d'OTP.
    otp = models.CharField(max_length=100, blank=True, default="")
    # FG/IG/MS.
    category = models.CharField(max_length=50, blank=True, default="")

    class Meta:
        ordering = ["flux_id", "id"]
        indexes = [
            # Le remplacement porte sur le couple (PFI, exercice) : réimporter
            # un fichier écrase ce périmètre et rien d'autre.
            models.Index(fields=["organization", "pfi", "exercice"]),
            # L'agrégation regroupe sur le flux seul, tous exercices confondus.
            models.Index(fields=["organization", "flux_id"]),
        ]
