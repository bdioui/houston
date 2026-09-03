from rest_framework import serializers
from .models import Axis, Group, GroupMember
from common.serializers import BaseModelSerializer, TenantRelatedField
from directory.models import Member

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