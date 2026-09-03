from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator


class SourceAwareUniqueTogetherValidator(UniqueTogetherValidator):
    """`UniqueTogetherValidator` utilisable quand `source` diffère du nom du champ.

    Celui de DRF se contredit : `filter_queryset` traduit bien nom → source,
    mais `__call__` cherche ensuite ses `fields` (des noms de serializer)
    parmi les clés de `attrs` (des sources). Dès qu'un champ est déclaré
    `member_id = TenantRelatedField(..., source="member")`, plus rien ne
    correspond, la garde `if checked_values` court-circuite, et le doublon
    part en base — où il ressort en IntegrityError, donc en 500.

    On duplique les valeurs sous les deux clés avant de déléguer : les
    méthodes qui attendent des sources et celle qui attend des noms y
    trouvent chacune leur compte.
    """

    def __call__(self, attrs, serializer):
        aliased = dict(attrs)
        for name in self.fields:
            source = serializer.fields[name].source
            if source in attrs:
                aliased[name] = attrs[source]
        super().__call__(aliased, serializer)


class BaseModelSerializer(serializers.ModelSerializer):
    """`ModelSerializer` dont les contraintes d'unicité rendent 400 et non 500.

    À faire hériter par défaut : le validateur de DRF échoue en silence, donc
    l'oubli ne se voit qu'en production. Hériter d'ici est le seul geste à
    retenir.
    """

    def get_unique_together_validators(self):
        validators = super().get_unique_together_validators()
        # Réassignation de classe plutôt que reconstruction : DRF choisit les
        # arguments du validateur, et une version future pourrait en ajouter
        # un que nous laisserions tomber sans le voir.
        for validator in validators:
            validator.__class__ = SourceAwareUniqueTogetherValidator
        return validators


class TenantRelatedField(serializers.PrimaryKeyRelatedField):
    """Référence vers un modèle tenant, exposée sous le nom `<champ>_id`.

    Le queryset est résolu à l'usage et non à la déclaration : écrire
    `queryset=Model.objects.all()` dans un corps de classe évaluerait le
    TenantManager à l'import, hors contexte tenant, et lèverait au démarrage.
    """

    def __init__(self, model, **kwargs):
        self.model = model
        kwargs.setdefault("allow_null", True)
        kwargs.setdefault("required", False)
        super().__init__(**kwargs)

    def get_queryset(self):
        return self.model.objects.all()
