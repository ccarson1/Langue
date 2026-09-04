from django.db import transaction
from api.models import Profile, StorageObject, Sentence
import os
from django.db.models import Sum
from django.conf import settings

class StorageManager:

    @staticmethod
    @transaction.atomic
    def add(user, amount):
        profile, _ = Profile.objects.select_for_update().get_or_create(user=user)

        profile.used_storage += amount
        profile.save(update_fields=['used_storage'])

        return profile.used_storage

    @staticmethod
    @transaction.atomic
    def subtract(user, amount):
        profile, _ = Profile.objects.select_for_update().get_or_create(user=user)

        profile.used_storage = max(
            profile.used_storage - amount,
            0
        )

        profile.save(update_fields=['used_storage'])

        return profile.used_storage

    @staticmethod
    @transaction.atomic
    def add_file(user, file_path):

        if not os.path.exists(file_path):
            return 0

        size = os.path.getsize(file_path)

        storage_object, created = StorageObject.objects.get_or_create(
            user=user,
            path=file_path,
            defaults={'size': size}
        )

        if created:
            StorageManager.add(user, size)

        elif storage_object.size != size:
            difference = size - storage_object.size

            StorageManager.add(user, difference)

            storage_object.size = size
            storage_object.save(
                update_fields=['size', 'updated_at']
            )

        return size

    @staticmethod
    @transaction.atomic
    def subtract_file(user, file_path):
        #"Add this amount of storage, but don't associate it with a particular file."
        try:
            storage_object = StorageObject.objects.get(
                user=user,
                path=file_path
            )
        except StorageObject.DoesNotExist:
            return 0

        size = storage_object.size

        StorageManager.subtract(user, size)

        storage_object.delete()

        return size

    @staticmethod
    @transaction.atomic
    def add_object(user, path, size):
        storage_object, created = StorageObject.objects.get_or_create(
            user=user,
            path=path,
            defaults={"size": size}
        )

        profile, _ = Profile.objects.get_or_create(user=user)

        if created:
            profile.used_storage += size

        else:
            storage_object.size += size
            storage_object.save(
                update_fields=["size", "updated_at"]
            )

            profile.used_storage += size

        profile.save(update_fields=["used_storage"])

        return storage_object.size

    @staticmethod
    def subtract_object(user, size):
        profile, _ = Profile.objects.get_or_create(user=user)

        profile.used_storage = max(
            profile.used_storage - size,
            0
        )

        profile.save(update_fields=['used_storage'])

        return profile.used_storage

    @staticmethod
    def get_used(user):
        """
        Get the user's current storage usage.
        """
        profile, _ = Profile.objects.get_or_create(user=user)

        return profile.used_storage

    @staticmethod
    def get_total(user):
        """
        Get the user's total storage allowance.
        """
        profile, _ = Profile.objects.get_or_create(user=user)

        return profile.total_storage

    @staticmethod
    def get_remaining(user):
        """
        Get how much storage the user has remaining.
        """
        profile, _ = Profile.objects.get_or_create(user=user)

        return max(profile.total_storage - profile.used_storage, 0)

    @staticmethod
    @transaction.atomic
    def recalculate_sentence_storage(user):
        sentences = Sentence.objects.filter(
            lesson__user=user
        )

        total = 0

        for sentence in sentences:
            total += len(
                (sentence.sentence or "").encode("utf-8")
            )
            total += len(
                (sentence.translated_sentence or "").encode("utf-8")
            )

        if total == 0:
            StorageObject.objects.filter(
                user=user,
                path="database/sentences"
            ).delete()

            return 0

        StorageObject.objects.update_or_create(
            user=user,
            path="database/sentences",
            defaults={"size": total}
        )

        return total

    @staticmethod
    @transaction.atomic
    def recalculate(user):
        profile, _ = Profile.objects.select_for_update().get_or_create(
            user=user
        )

        total = (
            StorageObject.objects
            .filter(user=user)
            .aggregate(total=Sum("size"))["total"]
            or 0
        )

        profile.used_storage = total
        profile.save(update_fields=["used_storage"])

        return total

    @staticmethod
    @transaction.atomic
    def delete_lesson_storage(user, lesson):
        lesson_folder = os.path.normpath(
            os.path.join(
                settings.MEDIA_ROOT,
                "lessons",
                str(lesson.uuid)
            )
        )

        storage_objects = StorageObject.objects.select_for_update().filter(
            user=user,
            path__startswith=lesson_folder
        )

        total = (
            storage_objects.aggregate(
                total=Sum("size")
            )["total"]
            or 0
        )

        if total > 0:
            StorageManager.subtract(user, total)

        storage_objects.delete()

        return total

    @staticmethod
    @transaction.atomic
    def add_image(user, image_field):
        if not image_field:
            return 0

        try:
            file_path = image_field.path
        except (ValueError, AttributeError):
            return 0

        StorageManager.add_file(user, file_path)

        return StorageObject.objects.get( user=user, path=file_path )

    @staticmethod
    @transaction.atomic
    def delete_image_storage(user, image_field):
        if not image_field:
            return 0

        try:
            file_path = image_field.path
        except (ValueError, AttributeError):
            return 0

        try:
            storage_object = StorageObject.objects.select_for_update().get(
                user=user,
                path=file_path
            )
        except StorageObject.DoesNotExist:
            return 0

        size = storage_object.size

        StorageManager.subtract(user, size)

        storage_object.delete()

        return size