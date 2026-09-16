"""Construction des FilterSet à partir du sérialiseur, et non du modèle.

C'est le point important de ce fichier. Filtrer sur les champs du *modèle*
donnerait `?project=12`, alors qu'on écrit `{"project_id": 12}` dans le corps
d'un POST : deux noms pour une seule notion, et la règle « le front nomme les
relations `<champ>_id` » cesserait de valoir à la lecture.

Partir du sérialiseur fait mieux que retomber sur la bonne convention : il en
est la source. `ToDoItem.todo_list` est exposé en `list_id` — un renommage
mécanique en `<champ>_id` aurait produit `todo_list_id` et raté ce cas. Ici le
filtre s'appelle `list_id` parce que le sérialiseur le nomme ainsi, sans
exception à maintenir.

Invariant : **on filtre avec le nom qu'on écrit.**
"""

import django_filters
from django.db.models import ForeignKey


def build_filterset(serializer_class, **extra):
    """FilterSet exposant chaque relation du sérialiseur sous son propre nom.

    `extra` reçoit des filtres supplémentaires, pour les traversées que le
    sérialiseur ne peut pas décrire — filtrer des membres par leur groupe, par
    exemple, passe par la table de liaison et n'est un champ d'aucun des deux.

    Seules les clés étrangères sont retenues. `organization` est exclu
    explicitement : le cloisonnement est l'affaire de TenantManager, et un
    paramètre d'URL portant ce nom donnerait l'illusion du contraire.
    """

    model = serializer_class.Meta.model
    fks = {
        f.name
        for f in model._meta.get_fields()
        if isinstance(f, ForeignKey) and f.name != "organization"
    }

    # `_declared_fields` et non `serializer_class().fields` : instancier le
    # sérialiseur fait construire ses validateurs d'unicité, qui interrogent
    # `_default_manager` — donc le TenantManager, qui lève hors requête. Le même
    # piège que celui contourné par TenantRelatedField, à un étage au-dessus.
    #
    # `source` est posé par `Field.__init__`, pas par `bind()` : il est donc déjà
    # lisible sur la classe, sans instance.
    attrs = {
        name: django_filters.NumberFilter(field_name=field.source)
        for name, field in serializer_class._declared_fields.items()
        if field.source in fks
    }
    attrs.update(extra)
    attrs["Meta"] = type("Meta", (), {"model": model, "fields": []})

    return type(f"{model.__name__}FilterSet", (django_filters.FilterSet,), attrs)


_cache: dict[type, type] = {}


def auto_filterset(serializer_class):
    """Version mémoïsée, appelée à chaque requête par `TenantViewSet`.

    Le cache porte sur la classe du sérialiseur, qui ne change jamais en cours
    d'exécution. Sans lui on reconstruirait une classe par requête.
    """

    if serializer_class not in _cache:
        _cache[serializer_class] = build_filterset(serializer_class)
    return _cache[serializer_class]
