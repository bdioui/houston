from django.core.exceptions import ValidationError
from django.db import models

from .tenant import (
    ProgramContextRequired,
    TenantContextRequired,
    get_current_org,
    get_current_program,
)


class TenantManager(models.Manager):
    """Manager par défaut des modèles multitenants.

    Il échoue bruyamment hors contexte tenant plutôt que de rendre les lignes de
    tous les laboratoires. Un oubli devient une erreur immédiate au lieu d'une
    fuite silencieuse.

    ATTENTION : à ce stade c'est la SEULE protection. Les politiques RLS
    PostgreSQL, qui rendraient l'isolation non contournable, arrivent au
    chantier 3 — elles supposent un rôle applicatif non-superutilisateur, que
    compose.yml ne fournit pas encore.
    """

    def get_queryset(self):
        org = get_current_org()
        if org is None:
            raise TenantContextRequired(
                f"{self.model.__name__} interrogé hors contexte tenant. "
                "Utiliser .all_tenants pour un accès délibérément global "
                "(migrations, admin, tâches Celery)."
            )
        return super().get_queryset().filter(organization=org)


class TenantModel(models.Model):
    organization = models.ForeignKey(
        "accounts.Organization",
        on_delete=models.CASCADE,
        related_name="+",
        db_index=True,
    )

    objects = TenantManager()
    # Indispensable : migrations, admin et tâches Celery s'exécutent hors
    # requête HTTP, donc sans tenant dans le ContextVar.
    all_tenants = models.Manager()

    class Meta:
        abstract = True


class ProgramManager(TenantManager):
    """Second axe de cloisonnement, à l'intérieur d'une organisation.

    `super()` est TenantManager : le filtre par organisation reste appliqué, et
    reste le premier à lever. Le filtre par programme se pose par-dessus. C'est
    redondant en théorie — un programme n'appartient qu'à une organisation — et
    volontaire en pratique : les deux garanties doivent tenir séparément, y
    compris le jour où la RLS PostgreSQL les traduira en deux politiques.
    """

    def get_queryset(self):
        # `super()` en premier, et l'ordre n'est pas cosmétique : il décide
        # laquelle des deux exceptions sort. Tester le programme d'abord ferait
        # répondre « choisissez un programme » à un compte sans organisation,
        # qui n'a rien à choisir — le refus le plus faible masquerait le plus
        # fort, et le client tournerait en rond sur le sélecteur.
        queryset = super().get_queryset()

        program = get_current_program()
        if program is None:
            raise ProgramContextRequired(
                f"{self.model.__name__} interrogé hors contexte programme. "
                "Utiliser .all_programs pour un accès à l'échelle du "
                "laboratoire, ou .all_tenants pour un accès global."
            )
        return queryset.filter(program=program)


class ProgramModel(TenantModel):
    """Modèle cloisonné par programme *et* par organisation.

    La colonne `organization` héritée est redondante : `program` la détermine.
    Elle est conservée pour que TenantManager reste uniforme sur les 40 tables
    et pour qu'une politique RLS par organisation puisse exister sans jointure.
    Le prix est un invariant de plus, vérifié dans clean().
    """

    program = models.ForeignKey(
        "projects.Program",
        on_delete=models.CASCADE,
        related_name="+",
        db_index=True,
    )

    objects = ProgramManager()
    # Filtré par organisation, pas par programme : ce qu'il faut pour une vue
    # à l'échelle du laboratoire — le sélecteur de programme, un tableau de
    # bord transverse, une tâche de consolidation.
    all_programs = TenantManager()

    class Meta:
        abstract = True

    def clean(self):
        """Vérifie que tous les chemins vers un programme concordent.

        Avec la colonne posée partout, chaque clé étrangère entre deux modèles
        cloisonnés ouvre un second chemin vers un programme, et rien en base
        n'impose qu'il désigne le même : une fiche action du programme A
        rattachable à un projet du programme B ferait fuir le cloisonnement par
        la liaison plutôt que par la table. Il y a une vingtaine de liaisons de
        ce genre, et il s'en ajoutera.

        D'où l'introspection plutôt qu'une méthode par table : la règle est
        exhaustive par construction et couvre les champs pas encore écrits.

        ATTENTION : clean() n'est appelé ni par save(), ni par bulk_create(),
        ni par les sérialiseurs DRF, qui ne font pas full_clean(). Tant que ces
        appels ne sont pas branchés, ceci valide les formulaires et rien
        d'autre — l'API reste ouverte à un POST fabriqué à la main.
        """
        super().clean()
        if self.program_id is None:
            return

        errors = {}

        if (
            self.organization_id is not None
            and self.program.organization_id != self.organization_id
        ):
            errors["program"] = ValidationError(
                "Ce programme appartient à une autre organisation.",
                code="program_org_mismatch",
            )

        for field in self._meta.concrete_fields:
            if not field.is_relation or field.name == "program":
                continue
            if not issubclass(field.related_model, ProgramModel):
                continue
            if getattr(self, field.attname) is None:
                continue
            if getattr(self, field.name).program_id != self.program_id:
                errors[field.name] = ValidationError(
                    "Cet élément appartient à un autre programme.",
                    code="program_mismatch",
                )

        if errors:
            raise ValidationError(errors)


class Status(models.Model):
    """Référentiel de workflow, commun à toute l'installation.

    Transverse aux apps — référencé depuis `actions` comme depuis `projects`,
    `directory` et `finance` — d'où sa place dans `common` : le mettre dans
    l'une des applications créerait une dépendance circulaire.

    **Délibérément non cloisonné.** Il l'a été (`TenantModel`) jusqu'à ce qu'on
    constate que rien n'écrit dans cette table : aucun écran ne crée ni ne
    renomme un statut, le workflow est imposé par l'application. La tenancy
    dupliquait donc les mêmes lignes par laboratoire, avec des clés primaires
    différentes à chaque fois — et le front, lui, comparait des identifiants en
    dur (`status_id !== 3`), ce qui n'était vrai que pour l'organisation
    héritée de Grist. C'est `code` qui sert désormais d'identité stable ; `id`
    n'est plus qu'une clé technique.

    Le couple (`context`, `code`) est unique. Le `label` varie d'un contexte à
    l'autre pour le même code — une convention « Soldée » là où un projet est
    « Terminé » — parce que c'est du vocabulaire d'affichage, pas de la
    sémantique : le code, lui, ne bouge pas.
    """

    # Cycle de vie partagé par tous les contextes sauf `participation`.
    TODO = "todo"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    DONE = "done"
    CANCELLED = "cancelled"

    label = models.CharField(max_length=100)
    context = models.CharField(max_length=50)
    code = models.CharField(max_length=32)

    class Meta:
        verbose_name_plural = "statuses"
        ordering = ["context", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["context", "code"],
                name="uniq_status_code_per_context",
            )
        ]

    def __str__(self) -> str:
        return f"{self.label} ({self.context}.{self.code})"
