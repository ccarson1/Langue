
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model

from api.models import RSSFeed, Language


class Command(BaseCommand):
    help = "Populate public Lithuanian LRT RSS feeds."

    def handle(self, *args, **options):
        User = get_user_model()

        user = User.objects.order_by("id").first()

        if user is None:
            raise CommandError(
                "No users exist. Create a user before running this command."
            )

        language = Language.objects.filter(
            lang_name="Lithuanian"
        ).first()

        if language is None:
            raise CommandError(
                "Lithuanian language was not found in the database."
            )

        feeds = [
            {
                "rssfeed_name": "LRT Lietuvoje",
                "rssfeed_url": (
                    "https://www.lrt.lt/naujienos/lietuvoje?rss"
                ),
            },
            {
                "rssfeed_name": "LRT Kultūra",
                "rssfeed_url": (
                    "https://www.lrt.lt/naujienos/kultura?rss"
                ),
            },
            {
                "rssfeed_name": "LRT Mokslas ir IT",
                "rssfeed_url": (
                    "https://www.lrt.lt/naujienos/mokslas-ir-it?rss"
                ),
            },
        ]

        created_count = 0
        updated_count = 0

        for feed_data in feeds:
            feed, created = RSSFeed.objects.get_or_create(
                rssfeed_url=feed_data["rssfeed_url"],
                defaults={
                    "user": user,
                    "native_language": language,
                    "rssfeed_name": feed_data["rssfeed_name"],
                    "is_public": True,
                },
            )

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Created: {feed.rssfeed_name}"
                    )
                )
            else:
                changed = []

                if feed.rssfeed_name != feed_data["rssfeed_name"]:
                    feed.rssfeed_name = feed_data["rssfeed_name"]
                    changed.append("rssfeed_name")

                if feed.native_language_id != language.pk:
                    feed.native_language = language
                    changed.append("native_language")

                if not feed.is_public:
                    feed.is_public = True
                    changed.append("is_public")

                if changed:
                    feed.save(update_fields=changed)
                    updated_count += 1

                self.stdout.write(
                    f"Already exists: {feed.rssfeed_name}"
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nFinished. Created: {created_count}, "
                f"updated: {updated_count}."
            )
        )
