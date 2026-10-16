
import django.db.models.deletion
from django.db import migrations, models


EXERCISE_TYPES = [
    ("multiple_choice", "Multiple Choice"),
    ("fill_in_the_blank", "Fill in the Blank"),
    ("sentence_correction", "Sentence Correction"),
    ("translation", "Translation"),
]


def convert_exercise_types(apps, schema_editor):
    GrammarExercise = apps.get_model("api", "GrammarExercise")
    GrammarExerciseType = apps.get_model("api", "GrammarExerciseType")
    database = schema_editor.connection.alias

    types = {}

    for code, name in EXERCISE_TYPES:
        exercise_type, _ = GrammarExerciseType.objects.using(
            database
        ).get_or_create(
            code=code,
            defaults={"name": name},
        )
        types[code] = exercise_type.id

    for exercise in GrammarExercise.objects.using(database).all().iterator():
        code = exercise.exercise_type

        if code not in types:
            raise ValueError(
                f"Unknown exercise type '{code}' "
                f"for GrammarExercise ID {exercise.id}"
            )

        GrammarExercise.objects.using(database).filter(
            pk=exercise.pk
        ).update(
            exercise_type_new_id=types[code]
        )


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0040_grammarexercisetype"),
    ]

    operations = [
        migrations.AddField(
            model_name="grammarexercise",
            name="exercise_type_new",
            field=models.ForeignKey(
                to="api.grammarexercisetype",
                on_delete=django.db.models.deletion.PROTECT,
                null=True,
                related_name="+",
            ),
        ),
        migrations.RunPython(convert_exercise_types),
        migrations.RemoveField(
            model_name="grammarexercise",
            name="exercise_type",
        ),
        migrations.RenameField(
            model_name="grammarexercise",
            old_name="exercise_type_new",
            new_name="exercise_type",
        ),
        migrations.AlterField(
            model_name="grammarexercise",
            name="exercise_type",
            field=models.ForeignKey(
                to="api.grammarexercisetype",
                on_delete=django.db.models.deletion.PROTECT,
                related_name="exercises",
            ),
        ),
    ]
