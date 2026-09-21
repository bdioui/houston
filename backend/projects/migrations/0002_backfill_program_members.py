from django.db import migrations


def backfill(apps, schema_editor):
    """Affecte à tous les programmes de son laboratoire chaque fiche qui n'en a
    aucun.

    L'écran Contacts filtre désormais sur les affectations. Sans reprise, toute
    fiche antérieure disparaîtrait de la vue par défaut — un retrait d'accès
    silencieux, le pire des résultats pour une migration.

    À *tous* les programmes et non au premier : c'est exactement ce que voyait
    l'utilisateur jusqu'ici, l'annuaire étant partagé par le laboratoire entier.
    La migration ne retire donc rien ; c'est à l'usage que l'équipe se taille,
    via `/api/program-members/`.
    """

    Member = apps.get_model("directory", "Member")
    Program = apps.get_model("projects", "Program")
    ProgramMember = apps.get_model("projects", "ProgramMember")

    programs_by_org = {}
    for program in Program.objects.all():
        programs_by_org.setdefault(program.organization_id, []).append(program)

    links = [
        ProgramMember(
            organization_id=member.organization_id,
            member=member,
            program=program,
        )
        for member in Member.objects.filter(program_links__isnull=True)
        for program in programs_by_org.get(member.organization_id, [])
    ]
    ProgramMember.objects.bulk_create(links)


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0001_initial"),
        ("directory", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]
