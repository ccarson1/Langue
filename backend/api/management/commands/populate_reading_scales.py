from django.core.management.base import BaseCommand

from api.models import ReadingLevelScale


class Command(BaseCommand):
    help = "Populate the database with known reading-level scales."

    def handle(self, *args, **options):
        scales = [
            {
                "name": "Common European Framework of Reference",
                "code": "CEFR",
                "measurement_type": "proficiency",
                "description": (
                    "Six language proficiency levels from A1 to C2. "
                    "Commonly used for language learning."
                ),
            },
            {
                "name": "US Grade Level",
                "code": "US_GRADE",
                "measurement_type": "grade_level",
                "description": (
                    "Reading difficulty expressed as a US school "
                    "grade-level estimate."
                ),
            },
            {
                "name": "Lexile Framework",
                "code": "LEXILE",
                "measurement_type": "text_complexity",
                "description": (
                    "A measure of reader ability and text complexity, "
                    "commonly expressed as a numeric value followed by L."
                ),
            },
            {
                "name": "ATOS",
                "code": "ATOS",
                "measurement_type": "grade_level",
                "description": (
                    "A readability formula that estimates book or text "
                    "difficulty using a grade-level scale."
                ),
            },
            {
                "name": "Flesch-Kincaid Grade Level",
                "code": "FKGL",
                "measurement_type": "grade_level",
                "description": (
                    "A readability formula that estimates the US grade "
                    "level needed to understand a text."
                ),
            },
            {
                "name": "Flesch Reading Ease",
                "code": "FRE",
                "measurement_type": "readability_score",
                "description": (
                    "A readability score where higher values generally "
                    "indicate easier text."
                ),
            },
            {
                "name": "Dale-Chall Readability",
                "code": "DALE_CHALL",
                "measurement_type": "readability_score",
                "description": (
                    "A readability formula using sentence length and "
                    "familiarity of vocabulary."
                ),
            },
            {
                "name": "Gunning Fog Index",
                "code": "GUNNING_FOG",
                "measurement_type": "grade_level",
                "description": (
                    "A readability formula estimating the years of "
                    "formal education needed to understand a text."
                ),
            },
            {
                "name": "SMOG Index",
                "code": "SMOG",
                "measurement_type": "grade_level",
                "description": (
                    "A readability formula estimating the education "
                    "level needed to understand a text."
                ),
            },
            {
                "name": "Coleman-Liau Index",
                "code": "COLEMAN_LIAU",
                "measurement_type": "grade_level",
                "description": (
                    "A readability formula based on characters, "
                    "words, and sentences."
                ),
            },
        ]

        created_count = 0
        existing_count = 0

        for scale_data in scales:
            scale, created = ReadingLevelScale.objects.get_or_create(
                code=scale_data["code"],
                defaults=scale_data,
            )

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Created: {scale.name}"
                    )
                )
            else:
                existing_count += 1
                self.stdout.write(
                    f"Already exists: {scale.name}"
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nFinished. Created: {created_count}, "
                f"already existed: {existing_count}."
            )
        )
