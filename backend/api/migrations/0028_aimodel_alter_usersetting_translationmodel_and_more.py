from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0027_sentence_position"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="TranslationModel",
            new_name="AIModel",
        ),
    ]