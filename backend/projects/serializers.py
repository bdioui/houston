from rest_framework import serializers

from .models import (
    Axis, Group, GroupMember, Kpi, KpiEntry, MobilityGrant, Phd, Program,
    Project, ProjectAttachment, ProjectCall, ProjectFormation, ProjectMember,
    ProjectMilestone, ProjectPartner, Publication, PublicationMember, TimeEntry,
)
from common.models import Status
from common.serializers import BaseModelSerializer, TenantRelatedField
from directory.models import Formation, Lab, Member, Partner

class AxisSerializer(BaseModelSerializer):
    class Meta:
        model = Axis
        fields = ["id", "name", "description"]

class GroupSerializer(BaseModelSerializer):
    owner_id = serializers.PrimaryKeyRelatedField(source="owner", read_only=True)
    class Meta:
        model = Group
        fields = ["id", "name", "owner_id"]

class GroupMemberSerializer(BaseModelSerializer):
    member_id = TenantRelatedField(Member, source="member", required=True, allow_null=False)
    group_id  = TenantRelatedField(Group,  source="group",  required=True, allow_null=False)

    class Meta:
        model = GroupMember
        fields = ["id", "group_id", "member_id"]


class ProgramSerializer(BaseModelSerializer):
    class Meta:
        model = Program
        fields = [
            "id", "name", "description", "budget", "start_date", "end_date",
            "logo", "management_fee_rate",
        ]


class KpiSerializer(BaseModelSerializer):
    class Meta:
        model = Kpi
        fields = ["id", "label", "unit", "definition", "dimension"]


class ProjectCallSerializer(BaseModelSerializer):
    axis_id = TenantRelatedField(Axis, source="axis")
    status_id = TenantRelatedField(Status, source="status")

    class Meta:
        model = ProjectCall
        fields = [
            "id", "axis_id", "title", "description", "start_date", "end_date",
            "status_id", "budget",
        ]


class ProjectSerializer(BaseModelSerializer):
    project_call_id = TenantRelatedField(
        ProjectCall, source="project_call", required=True, allow_null=False
    )
    status_id = TenantRelatedField(Status, source="status")

    class Meta:
        model = Project
        fields = [
            "id", "project_call_id", "status_id", "title", "description",
            "budget", "start_date", "end_date",
        ]


class ProjectPartnerSerializer(BaseModelSerializer):
    project_id = TenantRelatedField(Project, source="project", required=True, allow_null=False)
    partner_id = TenantRelatedField(Partner, source="partner", required=True, allow_null=False)

    class Meta:
        model = ProjectPartner
        fields = ["id", "project_id", "partner_id", "role", "amount", "label"]


class ProjectMilestoneSerializer(BaseModelSerializer):
    project_id = TenantRelatedField(Project, source="project", required=True, allow_null=False)
    status_id = TenantRelatedField(Status, source="status")

    class Meta:
        model = ProjectMilestone
        fields = ["id", "project_id", "title", "description", "due_date", "status_id"]


class ProjectMemberSerializer(BaseModelSerializer):
    member_id = TenantRelatedField(Member, source="member", required=True, allow_null=False)
    project_id = TenantRelatedField(Project, source="project", required=True, allow_null=False)
    participation_status_id = TenantRelatedField(Status, source="participation_status")

    class Meta:
        model = ProjectMember
        fields = ["id", "member_id", "project_id", "role", "participation_status_id"]


class TimeEntrySerializer(BaseModelSerializer):
    member_id = TenantRelatedField(Member, source="member", required=True, allow_null=False)
    project_id = TenantRelatedField(Project, source="project", required=True, allow_null=False)

    class Meta:
        model = TimeEntry
        fields = ["id", "member_id", "project_id", "days", "start_date", "end_date"]


class KpiEntrySerializer(BaseModelSerializer):
    project_id = TenantRelatedField(Project, source="project", required=True, allow_null=False)
    kpi_id = TenantRelatedField(Kpi, source="kpi", required=True, allow_null=False)
    # `member` est le membre mesuré, `author` celui qui saisit. Deux champs
    # distincts vers Member : sans source= explicite DRF ne saurait pas lequel.
    member_id = TenantRelatedField(Member, source="member")
    author_id = TenantRelatedField(Member, source="author")

    class Meta:
        model = KpiEntry
        fields = [
            "id", "project_id", "kpi_id", "member_id", "value", "comment",
            "date", "year", "author_id",
        ]


class PhdSerializer(BaseModelSerializer):
    member_id = TenantRelatedField(Member, source="member", required=True, allow_null=False)
    axis_id = TenantRelatedField(Axis, source="axis")

    class Meta:
        model = Phd
        fields = ["id", "member_id", "start_date", "end_date", "axis_id"]


class MobilityGrantSerializer(BaseModelSerializer):
    member_id = TenantRelatedField(Member, source="member", required=True, allow_null=False)
    axis_id = TenantRelatedField(Axis, source="axis")

    class Meta:
        model = MobilityGrant
        fields = ["id", "member_id", "start_date", "end_date", "axis_id"]


class ProjectFormationSerializer(BaseModelSerializer):
    project_id = TenantRelatedField(Project, source="project", required=True, allow_null=False)
    formation_id = TenantRelatedField(
        Formation, source="formation", required=True, allow_null=False
    )

    class Meta:
        model = ProjectFormation
        fields = ["id", "project_id", "formation_id"]


class ProjectAttachmentSerializer(BaseModelSerializer):
    project_id = TenantRelatedField(Project, source="project", required=True, allow_null=False)

    class Meta:
        model = ProjectAttachment
        fields = ["id", "project_id", "label", "url"]


class PublicationSerializer(BaseModelSerializer):
    project_id = TenantRelatedField(Project, source="project", required=True, allow_null=False)
    lab_id = TenantRelatedField(Lab, source="lab")

    class Meta:
        model = Publication
        fields = [
            "id", "project_id", "title", "lab_id", "subject", "journal",
            "year", "doi",
        ]


class PublicationMemberSerializer(BaseModelSerializer):
    publication_id = TenantRelatedField(
        Publication, source="publication", required=True, allow_null=False
    )
    member_id = TenantRelatedField(Member, source="member", required=True, allow_null=False)

    class Meta:
        model = PublicationMember
        fields = ["id", "publication_id", "member_id"]