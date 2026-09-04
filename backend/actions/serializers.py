from common.models import Status
from common.serializers import BaseModelSerializer, TenantRelatedField
from directory.models import Member
from finance.models import FinancialAgreement
from projects.models import Axis, Project

from .models import (
    ActionCard, AgreementActionCard, AxisActionCard, Category, Comment,
    MemberActionCard, ProjectActionCard, ToDoItem, ToDoList,
)


class CategorySerializer(BaseModelSerializer):
    parent_category_id = TenantRelatedField(Category, source="parent_category")

    class Meta:
        model = Category
        fields = ["id", "parent_category_id", "title", "color"]


class ActionCardSerializer(BaseModelSerializer):
    owner_id = TenantRelatedField(Member, source="owner")
    category_id = TenantRelatedField(Category, source="category")
    status_id = TenantRelatedField(Status, source="status")

    class Meta:
        model = ActionCard
        fields = [
            "id", "owner_id", "category_id", "status_id", "title", "color",
            "description", "start_date", "end_date", "full_address", "lat", "lon",
        ]


class CommentSerializer(BaseModelSerializer):
    owner_id = TenantRelatedField(Member, source="owner")
    parent_comment_id = TenantRelatedField(Comment, source="parent_comment")
    action_card_id = TenantRelatedField(
        ActionCard, source="action_card", required=True, allow_null=False
    )

    class Meta:
        model = Comment
        fields = [
            "id", "owner_id", "parent_comment_id", "action_card_id",
            "content", "timestamp",
        ]


class ToDoListSerializer(BaseModelSerializer):
    action_card_id = TenantRelatedField(
        ActionCard, source="action_card", required=True, allow_null=False
    )

    class Meta:
        model = ToDoList
        fields = ["id", "action_card_id", "title"]


class ToDoItemSerializer(BaseModelSerializer):
    list_id = TenantRelatedField(
        ToDoList, source="todo_list", required=True, allow_null=False
    )
    status_id = TenantRelatedField(Status, source="status")

    class Meta:
        model = ToDoItem
        fields = [
            "id", "list_id", "content", "status_id", "start_date", "end_time",
            "due_date",
        ]


class MemberActionCardSerializer(BaseModelSerializer):
    member_id = TenantRelatedField(Member, source="member", required=True, allow_null=False)
    action_card_id = TenantRelatedField(
        ActionCard, source="action_card", required=True, allow_null=False
    )
    participation_status_id = TenantRelatedField(Status, source="participation_status")

    class Meta:
        model = MemberActionCard
        fields = [
            "id", "member_id", "action_card_id", "role", "participation_status_id",
        ]


class AxisActionCardSerializer(BaseModelSerializer):
    axis_id = TenantRelatedField(Axis, source="axis", required=True, allow_null=False)
    action_card_id = TenantRelatedField(
        ActionCard, source="action_card", required=True, allow_null=False
    )

    class Meta:
        model = AxisActionCard
        fields = ["id", "axis_id", "action_card_id"]


class ProjectActionCardSerializer(BaseModelSerializer):
    project_id = TenantRelatedField(Project, source="project", required=True, allow_null=False)
    action_card_id = TenantRelatedField(
        ActionCard, source="action_card", required=True, allow_null=False
    )

    class Meta:
        model = ProjectActionCard
        fields = ["id", "project_id", "action_card_id"]


class AgreementActionCardSerializer(BaseModelSerializer):
    financial_agreement_id = TenantRelatedField(
        FinancialAgreement, source="financial_agreement", required=True, allow_null=False
    )
    action_card_id = TenantRelatedField(
        ActionCard, source="action_card", required=True, allow_null=False
    )

    class Meta:
        model = AgreementActionCard
        fields = ["id", "financial_agreement_id", "action_card_id"]
