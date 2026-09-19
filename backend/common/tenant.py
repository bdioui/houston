"""Porteurs du tenant courant et du programme courant.

Un ContextVar plutôt qu'une variable globale : il est isolé par thread *et* par
tâche asynchrone, donc deux requêtes concurrentes ne peuvent pas se marcher
dessus. Ce sont les seules sources de vérité consultées par les managers.

Les deux axes se remplissent désormais de la même façon : par *sélection*. Un
compte peut appartenir à plusieurs laboratoires (accounts.OrganizationMember)
et, dans chacun, être affecté à plusieurs programmes. Les deux valeurs viennent
donc du client, et tout ce qui vient du client se revérifie à chaque requête :
ce sont des préférences, jamais des autorisations. Sans cela, un rattachement
révoqué ne prendrait effet qu'à la reconnexion.

La symétrie s'arrête là. Le programme se résout *dans* l'organisation active et
jamais avant elle, parce que la fiche annuaire par laquelle passe l'affectation
appartient elle-même à un laboratoire.
"""

from contextvars import ContextVar
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from accounts.models import Organization
    from projects.models import Program

# Clés de session portant les deux sélections. Une session et non un jeton ni un
# en-tête : ce sont des préférences du poste de travail, elles doivent survivre
# à un rechargement de page et mourir avec la déconnexion.
#
# Ici plutôt que dans `middleware` : deux modules les utilisent — celui qui lit
# la sélection et celui qui l'écrit — et faire importer le middleware par une
# vue mettrait une dépendance à l'envers.
ORG_SESSION_KEY = "organization_id"
PROGRAM_SESSION_KEY = "program_id"


class TenantContextRequired(RuntimeError):
    """Un modèle cloisonné a été interrogé sans organisation active.

    Deux situations très différentes la déclenchent, et la couche modèle ne peut
    pas les distinguer — elle ne voit qu'un ContextVar vide. C'est
    `common.exceptions` qui tranche, en regardant si la requête avait des
    laboratoires à proposer : aucun rattachement donne un 403, plusieurs sans
    choix fait donnent un 409. Répondre « choisissez » à qui n'a rien à choisir
    l'enverrait dans une boucle.

    Levée aussi hors requête HTTP : migration, tâche Celery, script. Dans ce
    cas-là personne ne l'attrape et elle remonte telle quelle, ce qui est la
    bonne façon de découvrir qu'on a oublié `.all_tenants`.
    """


class ProgramContextRequired(RuntimeError):
    """Un modèle cloisonné par programme a été interrogé sans programme actif.

    Sous-classe de RuntimeError, et pas une exception DRF : elle est levée dans
    la couche modèle, qui ne doit rien savoir du transport. C'est
    `common.exceptions` qui la traduit en 409.

    Elle existe pour être attrapable *précisément*. Intercepter `RuntimeError`
    nu dans le gestionnaire d'exceptions transformerait n'importe quel bug en
    « choisissez un programme », ce qui est la meilleure façon de ne jamais voir
    une panne réelle.

    L'absence de programme n'est pas une panne : c'est un état normal de
    l'application — première connexion avec plusieurs affectations, affectation
    révoquée en cours de session, compte de support sans fiche annuaire. Le
    client a quelque chose à faire, encore faut-il le lui dire autrement que par
    un 500.
    """

_current_org: ContextVar[Optional["Organization"]] = ContextVar(
    "current_org", default=None
)

_current_program: ContextVar[Optional["Program"]] = ContextVar(
    "current_program", default=None
)


def get_current_org() -> Optional["Organization"]:
    return _current_org.get()


def set_current_org(org: Optional["Organization"]):
    """Retourne un token à repasser à reset_current_org()."""
    return _current_org.set(org)


def reset_current_org(token) -> None:
    _current_org.reset(token)


def get_current_program() -> Optional["Program"]:
    return _current_program.get()


def set_current_program(program: Optional["Program"]):
    """Retourne un token à repasser à reset_current_program()."""
    return _current_program.set(program)


def reset_current_program(token) -> None:
    _current_program.reset(token)
