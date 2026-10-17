
from django.core.management.base import BaseCommand

from api.models import ReadingLevel, ReadingLevelScale


class Command(BaseCommand):
    help = "Populate the database with known reading levels."

    def handle(self, *args, **options):
        levels = {
            "CEFR": [
                {"name": "A1", "value": 1, "sort_order": 1},
                {"name": "A2", "value": 2, "sort_order": 2},
                {"name": "B1", "value": 3, "sort_order": 3},
                {"name": "B2", "value": 4, "sort_order": 4},
                {"name": "C1", "value": 5, "sort_order": 5},
                {"name": "C2", "value": 6, "sort_order": 6},
            ],
            "US_GRADE": [
                {"name": "Kindergarten", "value": 0, "sort_order": 0},
                *[
                    {
                        "name": f"Grade {grade}",
                        "value": grade,
                        "sort_order": grade,
                    }
                    for grade in range(1, 13)
                ],
                {"name": "College", "value": 13, "sort_order": 13},
            ],
            "LEXILE": [
                {"name": "BR400L", "value": -400, "sort_order": 1},
                {"name": "BR300L", "value": -300, "sort_order": 2},
                {"name": "BR200L", "value": -200, "sort_order": 3},
                {"name": "BR100L", "value": -100, "sort_order": 4},
                {"name": "BR0L", "value": 0, "sort_order": 5},
                {"name": "100L", "value": 100, "sort_order": 6},
                {"name": "200L", "value": 200, "sort_order": 7},
                {"name": "300L", "value": 300, "sort_order": 8},
                {"name": "400L", "value": 400, "sort_order": 9},
                {"name": "500L", "value": 500, "sort_order": 10},
                {"name": "600L", "value": 600, "sort_order": 11},
                {"name": "700L", "value": 700, "sort_order": 12},
                {"name": "800L", "value": 800, "sort_order": 13},
                {"name": "900L", "value": 900, "sort_order": 14},
                {"name": "1000L", "value": 1000, "sort_order": 15},
                {"name": "1100L", "value": 1100, "sort_order": 16},
                {"name": "1200L", "value": 1200, "sort_order": 17},
                {"name": "1300L", "value": 1300, "sort_order": 18},
                {"name": "1400L", "value": 1400, "sort_order": 19},
                {"name": "1500L", "value": 1500, "sort_order": 20},
            ],
        }

        created_count = 0
        existing_count = 0

        for scale_code, scale_levels in levels.items():
            try:
                scale = ReadingLevelScale.objects.get(code=scale_code)
            except ReadingLevelScale.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(
                        f"Scale {scale_code} does not exist. "
                        "Run populate_reading_level_scales first."
                    )
                )
                continue

            for level_data in scale_levels:
                level, created = ReadingLevel.objects.get_or_create(
                    scale=scale,
                    name=level_data["name"],
                    defaults={
                        "value": level_data["value"],
                        "sort_order": level_data["sort_order"],
                    },
                )

                if created:
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f"Created: {level}")
                    )
                else:
                    existing_count += 1
                    self.stdout.write(f"Already exists: {level}")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nFinished. Created: {created_count}, "
                f"already existed: {existing_count}."
            )
        )
