from common.views import TenantViewSet

from .models import (
    ActionCard, AgreementActionCard, AxisActionCard, Category, Comment,
    MemberActionCard, ProjectActionCard, ToDoItem, ToDoList,
)
from .serializers import (
    ActionCardSerializer, AgreementActionCardSerializer,
    AxisActionCardSerializer, CategorySerializer, CommentSerializer,
    MemberActionCardSerializer, ProjectActionCardSerializer,
    ToDoItemSerializer, ToDoListSerializer,
)


class CategoryViewSet(TenantViewSet):
    serializer_class = CategorySerializer

    def get_queryset(self):
        return Category.objects.all()


class ActionCardViewSet(TenantViewSet):
    serializer_class = ActionCardSerializer

    def get_queryset(self):
        return ActionCard.objects.all()


class CommentViewSet(TenantViewSet):
    serializer_class = CommentSerializer

    def get_queryset(self):
        return Comment.objects.all()


class ToDoListViewSet(TenantViewSet):
    serializer_class = ToDoListSerializer

    def get_queryset(self):
        return ToDoList.objects.all()


class ToDoItemViewSet(TenantViewSet):
    serializer_class = ToDoItemSerializer

    def get_queryset(self):
        return ToDoItem.objects.all()


class MemberActionCardViewSet(TenantViewSet):
    serializer_class = MemberActionCardSerializer

    def get_queryset(self):
        return MemberActionCard.objects.all()


class AxisActionCardViewSet(TenantViewSet):
    serializer_class = AxisActionCardSerializer

    def get_queryset(self):
        return AxisActionCard.objects.all()


class ProjectActionCardViewSet(TenantViewSet):
    serializer_class = ProjectActionCardSerializer

    def get_queryset(self):
        return ProjectActionCard.objects.all()


class AgreementActionCardViewSet(TenantViewSet):
    serializer_class = AgreementActionCardSerializer

    def get_queryset(self):
        return AgreementActionCard.objects.all()
