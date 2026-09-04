from django.db import models
from django.utils import timezone

from common.models import TenantModel
from directory.models import Member
from finance.models import FinancialAgreement
from projects.models import Axis, Project


class Category(TenantModel):
    """Catégorie de fiche action, sur deux niveaux.

    `parent_category` pointe vers la même table : le front ne résout qu'un seul
    palier (`normalizeActionCardsFull`, src/lib/normalize.ts:151), donc une
    arborescence plus profonde ne serait pas affichée.
    """

    parent_category = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="children",
    )
    title = models.CharField(max_length=255)
    color = models.CharField(max_length=32, null=True, blank=True)

    class Meta:
        ordering = ["title"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.title


class ActionCard(TenantModel):
    owner = models.ForeignKey(
        Member, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="owned_action_cards",
    )
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="action_cards",
    )
    status = models.ForeignKey(
        "common.Status", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="action_cards",
    )
    title = models.CharField(max_length=255)
    color = models.CharField(max_length=32, blank=True, default="")
    description = models.TextField(blank=True, default="")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    full_address = models.CharField(max_length=500, blank=True, default="")
    lat = models.FloatField(null=True, blank=True)
    lon = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ["-start_date", "title"]

    def __str__(self):
        return self.title


class Comment(TenantModel):
    owner = models.ForeignKey(
        Member, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="comments",
    )
    parent_comment = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True,
        related_name="replies",
    )
    action_card = models.ForeignKey(
        ActionCard, on_delete=models.CASCADE, related_name="comments",
    )
    content = models.TextField(blank=True, default="")
    # `default` et non `auto_now_add` : la reprise des données Grist doit pouvoir
    # réécrire l'horodatage d'origine, ce qu'auto_now_add interdit à l'insertion.
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-timestamp"]


class ToDoList(TenantModel):
    action_card = models.ForeignKey(
        ActionCard, on_delete=models.CASCADE, related_name="todo_lists",
    )
    title = models.CharField(max_length=255)

    class Meta:
        ordering = ["title"]

    def __str__(self):
        return self.title


class ToDoItem(TenantModel):
    # Nommé `todo_list` et non `list` pour ne pas masquer le builtin dans le
    # corps de classe. Le front voit `list_id` : c'est le sérialiseur qui traduit.
    todo_list = models.ForeignKey(
        ToDoList, on_delete=models.CASCADE, related_name="items",
    )
    content = models.TextField(blank=True, default="")
    status = models.ForeignKey(
        "common.Status", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="todo_items",
    )
    start_date = models.DateField(null=True, blank=True)
    # Une date malgré son nom, hérité de Grist (src/lib/mock/index.ts:379).
    end_time = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["due_date"]


class MemberActionCard(TenantModel):
    member = models.ForeignKey(
        Member, on_delete=models.CASCADE, related_name="action_card_links",
    )
    action_card = models.ForeignKey(
        ActionCard, on_delete=models.CASCADE, related_name="member_links",
    )
    role = models.CharField(max_length=100, blank=True, default="")
    participation_status = models.ForeignKey(
        "common.Status", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="action_card_participations",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["action_card", "member"], name="uniq_member_action_card"
            )
        ]


class AxisActionCard(TenantModel):
    axis = models.ForeignKey(
        Axis, on_delete=models.CASCADE, related_name="action_card_links",
    )
    action_card = models.ForeignKey(
        ActionCard, on_delete=models.CASCADE, related_name="axis_links",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["action_card", "axis"], name="uniq_axis_action_card"
            )
        ]


class ProjectActionCard(TenantModel):
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="action_card_links",
    )
    action_card = models.ForeignKey(
        ActionCard, on_delete=models.CASCADE, related_name="project_links",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["action_card", "project"], name="uniq_project_action_card"
            )
        ]


class AgreementActionCard(TenantModel):
    financial_agreement = models.ForeignKey(
        FinancialAgreement, on_delete=models.CASCADE, related_name="action_card_links",
    )
    action_card = models.ForeignKey(
        ActionCard, on_delete=models.CASCADE, related_name="agreement_links",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["action_card", "financial_agreement"],
                name="uniq_agreement_action_card",
            )
        ]
