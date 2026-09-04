from rest_framework.routers import DefaultRouter

from .views import (
    ActionCardViewSet, AgreementActionCardViewSet, AxisActionCardViewSet,
    CategoryViewSet, CommentViewSet, MemberActionCardViewSet,
    ProjectActionCardViewSet, ToDoItemViewSet, ToDoListViewSet,
)

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("action-cards", ActionCardViewSet, basename="action-card")
router.register("comments", CommentViewSet, basename="comment")
router.register("todo-lists", ToDoListViewSet, basename="todo-list")
router.register("todo-items", ToDoItemViewSet, basename="todo-item")
router.register("member-action-cards", MemberActionCardViewSet, basename="member-action-card")
router.register("axis-action-cards", AxisActionCardViewSet, basename="axis-action-card")
router.register("project-action-cards", ProjectActionCardViewSet, basename="project-action-card")
router.register("agreement-action-cards", AgreementActionCardViewSet, basename="agreement-action-card")

urlpatterns = router.urls
