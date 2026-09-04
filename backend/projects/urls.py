from rest_framework.routers import DefaultRouter

from .views import (
    AxisViewSet, GroupViewSet, GroupMemberViewSet, KpiViewSet, KpiEntryViewSet,
    MobilityGrantViewSet, PhdViewSet, ProgramViewSet, ProjectViewSet,
    ProjectAttachmentViewSet, ProjectCallViewSet, ProjectFormationViewSet,
    ProjectMemberViewSet, ProjectMilestoneViewSet, ProjectPartnerViewSet,
    PublicationViewSet, PublicationMemberViewSet, TimeEntryViewSet,
)

router = DefaultRouter()
router.register("axes", AxisViewSet, basename="axis")
router.register("groups", GroupViewSet, basename="group")
router.register("group-members", GroupMemberViewSet, basename="group-member")
router.register("programs", ProgramViewSet, basename="program")
router.register("kpis", KpiViewSet, basename="kpi")
router.register("kpi-entries", KpiEntryViewSet, basename="kpi-entry")
router.register("project-calls", ProjectCallViewSet, basename="project-call")
router.register("projects", ProjectViewSet, basename="project")
router.register("project-partners", ProjectPartnerViewSet, basename="project-partner")
router.register("project-milestones", ProjectMilestoneViewSet, basename="project-milestone")
router.register("project-members", ProjectMemberViewSet, basename="project-member")
router.register("project-formations", ProjectFormationViewSet, basename="project-formation")
router.register("project-attachments", ProjectAttachmentViewSet, basename="project-attachment")
router.register("time-entries", TimeEntryViewSet, basename="time-entry")
router.register("phds", PhdViewSet, basename="phd")
router.register("mobility-grants", MobilityGrantViewSet, basename="mobility-grant")
router.register("publications", PublicationViewSet, basename="publication")
router.register("publication-members", PublicationMemberViewSet, basename="publication-member")

urlpatterns = router.urls
