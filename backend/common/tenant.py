"""Porteur du tenant courant.

Un ContextVar plutôt qu'une variable globale : il est isolé par thread *et* par
tâche asynchrone, donc deux requêtes concurrentes ne peuvent pas se marcher
dessus. C'est la seule source de vérité consultée par TenantManager.
"""

from contextvars import ContextVar
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from accounts.models import Organization

_current_org: ContextVar[Optional["Organization"]] = ContextVar(
    "current_org", default=None
)


def get_current_org() -> Optional["Organization"]:
    return _current_org.get()


def set_current_org(org: Optional["Organization"]):
    """Retourne un token à repasser à reset_current_org()."""
    return _current_org.set(org)


def reset_current_org(token) -> None:
    _current_org.reset(token)
