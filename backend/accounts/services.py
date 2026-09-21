from django.db import transaction
from django.utils.text import slugify

from directory.models import Member
from projects.models import Program, ProgramMember

from .models import Organization, OrganizationMember


def _unique_slug(name: str) -> str:
    base = slugify(name)[:40] or "laboratoire"
    slug, n = base, 2
    while Organization.objects.filter(slug=slug).exists():
        slug = f"{base}-{n}"
        n += 1
    return slug


@transaction.atomic
def create_organization(*, user, organization_name, program_name="Programme principal", program_pfi=""):
    """Les cinq créations d'un espace de travail, pour un compte qui existe déjà.

    Tout passe par `all_tenants` avec un `organization=` explicite, et c'est
    vrai des deux appelants pour deux raisons opposées : au signup il n'y a
    aucun contexte tenant (requête anonyme), depuis une session ouverte il y en
    a un, mais il désigne le laboratoire *précédent*.

    Le nom du programme est un défaut et non une question posée : un
    laboratoire qui n'en suivra jamais qu'un n'a rien à nommer, et le premier
    écran de l'application n'est pas le moment d'expliquer ce qu'est un
    programme. Il se renomme ensuite comme n'importe quel autre.
    """
    org = Organization.objects.create(
        name=organization_name, slug=_unique_slug(organization_name)
    )
    # `is_staff` : celui de directory.Member — « membre de l'équipe » —, pas
    # celui de Django. Le fondateur de son propre laboratoire en fait
    # nécessairement partie, et le défaut du champ est False.
    member = Member.all_tenants.create(
        organization=org,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        is_staff=True,
    )
    # Les deux maillons qu'il ne faut pas manquer. OrganizationMember rattache
    # le compte au laboratoire *et* y désigne sa fiche : sans lui le compte
    # naîtrait sans aucune appartenance, donc sans contexte, donc en 403 sur
    # tout. Et c'est ProgramMember, plus bas, qui porte l'affectation — il
    # pointe vers Member, jamais vers User.
    # `is_owner` : celui qui fonde l'espace de travail en est le propriétaire,
    # et c'est le seul endroit où ce titre naît — ensuite il se transmet, il ne
    # s'attribue pas.
    OrganizationMember.objects.create(
        user=user, organization=org, member=member, is_owner=True,
    )
    program = Program.all_tenants.create(
        organization=org, name=program_name, pfi=program_pfi,
    )
    # `is_admin` : le propriétaire administre ses programmes *par affectation*,
    # pas par exception dans le code du cloisonnement. C'est la règle que tient
    # aussi `ProgramViewSet.perform_create` pour les programmes suivants.
    # `role` reste un intitulé libre, lu par des humains, sans effet.
    ProgramMember.all_tenants.create(
        organization=org,
        member=member,
        program=program,
        role="Coordination",
        is_admin=True,
    )
    return org, program

