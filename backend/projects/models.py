from django.db import models
from common.models import TenantModel
from directory.models import Member

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
    