from django.db import models
from common.models import TenantModel
from directory.models import Formation, Lab, Member

class Axis(TenantModel): 
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

class Group(TenantModel):
    name = models.CharField(max_length=200)
    owner = models.ForeignKey(
        Member, 
        on_delete=models.SET_NULL, 
        null=True,
        blank=True,
        related_name='owned_groups'
        )
    class Meta: 
        ordering = ["name"]

    def __str__(self):
        return self.name

class GroupMember(TenantModel):
    member = models.ForeignKey(
        Member, 
        on_delete=models.CASCADE, 
        related_name='group_links'
        )
    group = models.ForeignKey(
        Group, 
        on_delete=models.CASCADE, 
        related_name='member_links'
        )

    class Meta:
            constraints = [
                models.UniqueConstraint(fields=["group", "member"], name="uniq_group_member")
            ]


class Program(TenantModel):
    """Le programme financeur qui chapeaute le laboratoire.

    Table à une seule ligne en pratique : Dashboard.tsx prend `[0]`. Elle reste
    une table plutôt qu'un réglage parce qu'elle porte un budget et des dates,
    et qu'un labo pourrait en suivre deux.
    """

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    budget = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    logo = models.TextField(blank=True, default="")
    # Un pourcentage, pas un ratio : Dashboard.tsx affiche « Frais gestion : 8 % »
    # et calcule `totalSpent * rate / 100`.
    management_fee_rate = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Kpi(TenantModel):
    label = models.CharField(max_length=255)
    unit = models.CharField(max_length=50, blank=True, default="")
    definition = models.TextField(blank=True, default="")
    dimension = models.CharField(max_length=100, blank=True, default="")

    class Meta:
        ordering = ["label"]

    def __str__(self):
        return self.label


class ProjectCall(TenantModel):
    axis = models.ForeignKey(
        Axis, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="project_calls",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    status = models.ForeignKey(
        "common.Status", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="project_calls",
    )
    budget = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ["-start_date", "title"]

    def __str__(self):
        return self.title


class Project(TenantModel):
    project_call = models.ForeignKey(
        ProjectCall, on_delete=models.CASCADE, related_name="projects",
    )
    status = models.ForeignKey(
        "common.Status", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="projects",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    budget = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["-start_date", "title"]

    def __str__(self):
        return self.title


class ProjectPartner(TenantModel):
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="partner_links",
    )
    partner = models.ForeignKey(
        "directory.Partner", on_delete=models.CASCADE, related_name="project_links",
    )
    role = models.CharField(max_length=100, blank=True, default="")
    amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    label = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["project", "partner"], name="uniq_project_partner"
            )
        ]


class ProjectMilestone(TenantModel):
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="milestones",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    due_date = models.DateField(null=True, blank=True)
    status = models.ForeignKey(
        "common.Status", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="milestones",
    )

    class Meta:
        ordering = ["due_date"]

    def __str__(self):
        return self.title


class ProjectMember(TenantModel):
    member = models.ForeignKey(
        Member, on_delete=models.CASCADE, related_name="project_links",
    )
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="member_links",
    )
    role = models.CharField(max_length=100, blank=True, default="")
    participation_status = models.ForeignKey(
        "common.Status", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="project_participations",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["project", "member"], name="uniq_project_member"
            )
        ]


class TimeEntry(TenantModel):
    member = models.ForeignKey(
        Member, on_delete=models.CASCADE, related_name="time_entries",
    )
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="time_entries",
    )
    days = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["-start_date"]


class KpiEntry(TenantModel):
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="kpi_entries",
    )
    kpi = models.ForeignKey(Kpi, on_delete=models.CASCADE, related_name="entries")
    # Le membre *mesuré*, distinct de l'auteur de la saisie. Les deux pointent
    # vers Member, d'où deux related_name explicites.
    member = models.ForeignKey(
        Member, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="kpi_entries",
    )
    author = models.ForeignKey(
        Member, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="authored_kpi_entries",
    )
    value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    comment = models.TextField(blank=True, default="")
    date = models.DateField(null=True, blank=True)
    # Texte et non entier : sert d'étiquette de regroupement, parfois « 2024-2025 ».
    year = models.CharField(max_length=20, blank=True, default="")

    class Meta:
        ordering = ["-date"]


class Phd(TenantModel):
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="phds")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    axis = models.ForeignKey(
        Axis, on_delete=models.SET_NULL, null=True, blank=True, related_name="phds",
    )

    class Meta:
        ordering = ["-start_date"]


class MobilityGrant(TenantModel):
    member = models.ForeignKey(
        Member, on_delete=models.CASCADE, related_name="mobility_grants",
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    axis = models.ForeignKey(
        Axis, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="mobility_grants",
    )

    class Meta:
        ordering = ["-start_date"]


class ProjectFormation(TenantModel):
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="formation_links",
    )
    formation = models.ForeignKey(
        Formation, on_delete=models.CASCADE, related_name="project_links",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["project", "formation"], name="uniq_project_formation"
            )
        ]


class ProjectAttachment(TenantModel):
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="attachments",
    )
    label = models.CharField(max_length=255, blank=True, default="")
    url = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["label"]


class Publication(TenantModel):
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="publications",
    )
    title = models.CharField(max_length=500)
    lab = models.ForeignKey(
        Lab, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="publications",
    )
    subject = models.CharField(max_length=255, blank=True, default="")
    journal = models.CharField(max_length=255, blank=True, default="")
    year = models.CharField(max_length=20, blank=True, default="")
    doi = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ["-year", "title"]

    def __str__(self):
        return self.title


class PublicationMember(TenantModel):
    publication = models.ForeignKey(
        Publication, on_delete=models.CASCADE, related_name="member_links",
    )
    member = models.ForeignKey(
        Member, on_delete=models.CASCADE, related_name="publication_links",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["publication", "member"], name="uniq_publication_member"
            )
        ]
