from common.views import TenantViewSet

from .models import (
    Axis, Group, GroupMember, Kpi, KpiEntry, MobilityGrant, Phd, Program,
    Project, ProjectAttachment, ProjectCall, ProjectFormation, ProjectMember,
    ProjectMilestone, ProjectPartner, Publication, PublicationMember, TimeEntry,
)
from .serializers import (
    AxisSerializer, GroupSerializer, GroupMemberSerializer, KpiSerializer,
    KpiEntrySerializer, MobilityGrantSerializer, PhdSerializer,
    ProgramSerializer, ProjectSerializer, ProjectAttachmentSerializer,
    ProjectCallSerializer, ProjectFormationSerializer, ProjectMemberSerializer,
    ProjectMilestoneSerializer, ProjectPartnerSerializer, PublicationSerializer,
    PublicationMemberSerializer, TimeEntrySerializer,
)


class AxisViewSet(TenantViewSet):
    serializer_class = AxisSerializer

    def get_queryset(self):
        return Axis.objects.all()

class GroupViewSet(TenantViewSet):
    serializer_class = GroupSerializer

    def get_queryset(self):
        return Group.objects.all()

    def get_create_kwargs(self):
        return {**super().get_create_kwargs(), "owner": self.request.user.member}

class GroupMemberViewSet(TenantViewSet):
    serializer_class = GroupMemberSerializer

    def get_queryset(self):
        return GroupMember.objects.all()


class ProgramViewSet(TenantViewSet):
    serializer_class = ProgramSerializer

    def get_queryset(self):
        return Program.objects.all()


class KpiViewSet(TenantViewSet):
    serializer_class = KpiSerializer

    def get_queryset(self):
        return Kpi.objects.all()


class ProjectCallViewSet(TenantViewSet):
    serializer_class = ProjectCallSerializer

    def get_queryset(self):
        return ProjectCall.objects.all()


class ProjectViewSet(TenantViewSet):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return Project.objects.all()


class ProjectPartnerViewSet(TenantViewSet):
    serializer_class = ProjectPartnerSerializer

    def get_queryset(self):
        return ProjectPartner.objects.all()


class ProjectMilestoneViewSet(TenantViewSet):
    serializer_class = ProjectMilestoneSerializer

    def get_queryset(self):
        return ProjectMilestone.objects.all()


class ProjectMemberViewSet(TenantViewSet):
    serializer_class = ProjectMemberSerializer

    def get_queryset(self):
        return ProjectMember.objects.all()


class TimeEntryViewSet(TenantViewSet):
    serializer_class = TimeEntrySerializer

    def get_queryset(self):
        return TimeEntry.objects.all()


class KpiEntryViewSet(TenantViewSet):
    serializer_class = KpiEntrySerializer

    def get_queryset(self):
        return KpiEntry.objects.all()


class PhdViewSet(TenantViewSet):
    serializer_class = PhdSerializer

    def get_queryset(self):
        return Phd.objects.all()


class MobilityGrantViewSet(TenantViewSet):
    serializer_class = MobilityGrantSerializer

    def get_queryset(self):
        return MobilityGrant.objects.all()


class ProjectFormationViewSet(TenantViewSet):
    serializer_class = ProjectFormationSerializer

    def get_queryset(self):
        return ProjectFormation.objects.all()


class ProjectAttachmentViewSet(TenantViewSet):
    serializer_class = ProjectAttachmentSerializer

    def get_queryset(self):
        return ProjectAttachment.objects.all()


class PublicationViewSet(TenantViewSet):
    serializer_class = PublicationSerializer

    def get_queryset(self):
        return Publication.objects.all()


class PublicationMemberViewSet(TenantViewSet):
    serializer_class = PublicationMemberSerializer

    def get_queryset(self):
        return PublicationMember.objects.all()
