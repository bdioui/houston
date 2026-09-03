from common.views import TenantViewSet
from common.tenant import get_current_org

from .models import Axis, Group, GroupMember
from .serializers import AxisSerializer, GroupSerializer, GroupMemberSerializer


class AxisViewSet(TenantViewSet):
    serializer_class = AxisSerializer

    def get_queryset(self):
        return Axis.objects.all()

class GroupViewSet(TenantViewSet):
    serializer_class = GroupSerializer

    def get_queryset(self):
        return Group.objects.all()

    def perform_create(self, serializer):
        serializer.save(
            organization=get_current_org(),
            owner=self.request.user.member,
        )

class GroupMemberViewSet(TenantViewSet):
    serializer_class = GroupMemberSerializer

    def get_queryset(self):
        return GroupMember.objects.all()