from django.db import models
from django.db.models import JSONField # Use if on PostgreSQL; else see notes below
from django.utils import timezone
from django.contrib.auth.models import User
import uuid
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings
import os


def lesson_file_upload_path(instance, filename):
    return f'lessons/{instance.uuid}/{filename}'

# def media_file_upload_path(instance, filename):
#     return f'lessons/{instance.uuid}/{filename}'

def media_file_upload_path(instance, filename):
    extension = os.path.splitext(filename)[1].lower()
    return f'lessons/{instance.uuid}/{instance.uuid}{extension}'

def record_file_upload_path(instance, filename):
    return f'record/{filename}'

def image_file_upload_path(instance, filename):
    return f'images/{filename}'

class Tag(models.Model):
    name = models.CharField( max_length=100, unique=True )
    creation_date = models.DateTimeField( auto_now_add=True )

    def __str__(self):
        return self.name

class Language(models.Model):
    id = models.AutoField(primary_key=True, db_column='ID')
    lang_name = models.CharField(max_length=25, unique=True)
    yt_dlp_lang = models.CharField(max_length=25, default="")
    tesseract_langcode = models.CharField(max_length=25, default="")

    class Meta:
        db_table = 'Languages'

    def __str__(self):
        return self.lang_name




class Editor(models.Model):
    editor_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, db_column='user_id', on_delete=models.CASCADE)
    creation_date = models.DateField(default=timezone.now)

    class Meta:
        db_table = 'Editors'


class Word(models.Model):
    id = models.AutoField(primary_key=True, db_column='ID')
    word = models.CharField(max_length=30)
    language = models.ForeignKey(Language, db_column='lang_id', on_delete=models.CASCADE)
    frequency = models.DecimalField(max_digits=6, decimal_places=3, validators=[MinValueValidator(0.0), MaxValueValidator(100.0)], default=0.000)

    class Meta:
        db_table = 'Words'

    def __str__(self):
        return self.word


class WordTranslation(models.Model):
    id = models.AutoField(primary_key=True, db_column='ID')
    native_language = models.ForeignKey(Language, db_column='nat_id', on_delete=models.CASCADE, related_name='word_translations_native')
    target_language = models.ForeignKey(Language, db_column='tar_id', on_delete=models.CASCADE, related_name='word_translations_target')
    user = models.ForeignKey(User, db_column='user_ID', on_delete=models.CASCADE)
    word = models.ForeignKey(Word, db_column='word_id', on_delete=models.CASCADE)
    definition = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'Word_Translations'




class UserWord(models.Model):
    id = models.AutoField(primary_key=True, db_column='ID')
    word = models.ForeignKey(Word, db_column='word_id', on_delete=models.CASCADE)
    frequency = models.DecimalField(max_digits=6, decimal_places=3, validators=[MinValueValidator(0.0), MaxValueValidator(100.0)], default=0.000)
    clicks = models.PositiveIntegerField(default=0)
    creation_date = models.DateField(default=timezone.now)
    review_date = models.DateField(default=timezone.now)
    last_seen = models.DateField(default=timezone.now)
    user = models.ForeignKey(User, db_column='user_id', on_delete=models.CASCADE)

    class Meta:
        db_table = 'User_Words'

    def __str__(self):
        return self.word.word + " : " + str(self.frequency)


class Report(models.Model):
    id = models.AutoField(primary_key=True, db_column='ID')
    report_name = models.CharField(max_length=50)
    report_date = models.DateField()
    user = models.ForeignKey(User, db_column='user_id', on_delete=models.CASCADE)

    class Meta:
        db_table = 'Reports'


class Lesson(models.Model):
    id = models.AutoField(primary_key=True, db_column='ID')
    doc_file = models.FileField(upload_to=lesson_file_upload_path, null=True, blank=True)
    media_file = models.FileField(upload_to=media_file_upload_path, null=True, blank=True)
    media_folder = models.CharField(max_length=500, blank=True, null=True)
    image = models.ImageField(null=True, blank=True, default='images/default-01.jpg', upload_to=image_file_upload_path)
    user = models.ForeignKey(User, db_column='user_id', on_delete=models.CASCADE)
    title = models.CharField(max_length=100, blank=True, null=True)
    url = models.URLField(max_length=1000, blank=True, null=True)
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    native_language = models.ForeignKey(Language, db_column='nat_id', on_delete=models.CASCADE, related_name='lesson_native')
    target_language = models.ForeignKey(Language, db_column='tar_id', on_delete=models.CASCADE, related_name='lesson_target')
    lesson_private = models.BooleanField(default=False)
    audioUploaded = models.BooleanField(default=False)
    fileUploaded = models.BooleanField(default=False)
    urlReference = models.BooleanField(default=False)
    videoFormat = models.BooleanField(default=False)
    tags = models.ManyToManyField(Tag, blank=True, related_name='lesson_tags' )
    
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Lesson'


class Phrase(models.Model):
    id = models.AutoField(primary_key=True, db_column='ID')
    phrase = models.CharField(max_length=60)
    language = models.ForeignKey(Language, db_column='lang_id', on_delete=models.CASCADE)

    class Meta:
        db_table = 'Phrases'

    def __str__(self):
        return self.phrase


class PhraseTranslation(models.Model):
    id = models.AutoField(primary_key=True, db_column='ID')
    native_language = models.ForeignKey(Language, db_column='nat_id', on_delete=models.CASCADE, related_name='phrase_translations_native')
    target_language = models.ForeignKey(Language, db_column='tar_id', on_delete=models.CASCADE, related_name='phrase_translations_target')
    user = models.ForeignKey(User, db_column='user_ID', on_delete=models.CASCADE)
    phrase = models.ForeignKey(Phrase, db_column='phrase_id', on_delete=models.CASCADE)
    definition = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'Phrase_Translations'

class TranslationModel(models.Model):
    MODEL_TYPES = [
        ("m2m100", "M2M100"),
        ("opus", "OPUS"),
    ]

    name = models.CharField(max_length=100)
    model_type = models.CharField(max_length=50, choices=MODEL_TYPES)
    model_name = models.CharField(max_length=255)
    save_path = models.CharField(max_length=255)
    source_language = models.CharField(max_length=20, null=True, blank=True)
    target_language = models.CharField(max_length=20, null=True, blank=True)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.source_language} → {self.target_language})"
        
class UserSetting(models.Model):
    id = models.AutoField(primary_key=True, db_column='ID')
    user = models.ForeignKey(User, db_column='user_ID', on_delete=models.CASCADE)
    native_language = models.ForeignKey(Language, db_column='nat_id', on_delete=models.CASCADE, related_name='settings_translations_native')
    target_language = models.ForeignKey(Language, db_column='tar_id', on_delete=models.CASCADE, related_name='settings_translations_target')
    notifications = models.BooleanField(default=True, db_column='notifications')
    dictionary_name = models.CharField( max_length=255, blank=True, null=True )
    user_set_volume = models.DecimalField(max_digits=4, decimal_places=2, default=1.00)
    user_set_speed = models.DecimalField(max_digits=4, decimal_places=2, default=1.00)
    repeat_audio = models.BooleanField(default=False, db_column='repeat_audio')
    repeat_audio_all = models.BooleanField(default=False, db_column='repeat_audio_all')
    shuffle_audio = models.BooleanField(default=False, db_column='shuffle_audio')
    showVideoCaptions = models.BooleanField(default=False)
    showVideoView = models.BooleanField(default=False)
    continuousPlay = models.BooleanField(default=False)
    translationModel = models.ForeignKey(TranslationModel,on_delete=models.CASCADE, related_name='settings_translation_model', null=True, blank=True)
    
class Sentence(models.Model):
    id = models.AutoField(primary_key=True, db_column='ID')
    sentence = models.CharField(max_length=250)
    start_ms = models.PositiveIntegerField(default=0)
    end_ms = models.PositiveIntegerField(default=0)
    translated_sentence = models.CharField(max_length=250)
    lesson_language = models.ForeignKey(Language, db_column='lesson_lang_id', related_name='lesson_sentences', on_delete=models.CASCADE)
    translate_language = models.ForeignKey(Language, db_column='translate_lang_id', related_name='translation_sentences', on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, db_column='lesson_id', on_delete=models.CASCADE)

    class Meta:
        db_table = 'Sentence'

    def __str__(self):
        return self.sentence
    
class UserLessonsProgress(models.Model):
    id = models.AutoField(primary_key=True, db_column='ID')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lesson_progress')
    lesson = models.ForeignKey(Lesson, db_column='lesson_id', on_delete=models.SET_NULL, null=True, default=7)
    current_lesson_index = models.SmallIntegerField(default=0)
    last_viewed = models.DateField(default=timezone.now)

    class Meta:
        db_table = 'user_lessons_progress'
        unique_together = ('user', 'lesson')  # Ensures one entry per user per lesson

    def __str__(self):
        return f"{self.user.username} - {self.lesson.title if self.lesson else 'No Lesson'} - Index {self.current_lesson_index}"

    
class Profile(models.Model):
    id = models.AutoField(primary_key=True, db_column='ID')
    user = models.OneToOneField(User, db_column='user_id', on_delete=models.CASCADE)
    profile_img = models.CharField(max_length=255, blank=True, null=True)
    uploaded_docs = models.SmallIntegerField(default=0)
    creation_date = models.DateField(default=timezone.now)
    logged_hours = models.IntegerField(default=0)
    graph_type = models.CharField(max_length=20, blank=True, null=True)
    native_language = models.ForeignKey(Language, db_column='native_id', on_delete=models.SET_NULL, null=True, related_name='users_native')
    current_lesson = models.ForeignKey(UserLessonsProgress, db_column='lesson_progress', on_delete=models.SET_NULL, blank=True, null=True)

    # For languages field:
    # If you use PostgreSQL, you can use JSONField as below.
    # If not, consider using TextField with JSON serialization/deserialization in code.
    languages = JSONField(blank=True, null=True)

    class Meta:
        db_table = 'Profile'



class Channel(models.Model):
    id = models.AutoField(primary_key=True, db_column='ID')
    user = models.ForeignKey( User, db_column='user_id', on_delete=models.CASCADE, related_name='channels' )
    channel_img = models.CharField(max_length=255, blank=True, null=True)
    channel_name = models.CharField(max_length=30)
    channel_url = models.URLField(max_length=1000, blank=True, null=True)
    native_language = models.ForeignKey(Language, db_column='nat_id', on_delete=models.CASCADE, related_name='channel_native')
    channel_private = models.BooleanField(default=False)
    is_favorite = models.BooleanField(default=False, db_column='is_favorite')
    created_at = models.DateTimeField(auto_now_add=True)
    tags = models.ManyToManyField(Tag, blank=True, related_name='channel_tags' )


class ChannelVote(models.Model):
    LIKE = 1
    DISLIKE = -1
    VOTE_CHOICES = ( (LIKE, 'Like'), (DISLIKE, 'Dislike'), )
    channel = models.ForeignKey( Channel, on_delete=models.CASCADE, related_name='votes' )
    user = models.ForeignKey( User, on_delete=models.CASCADE )
    vote = models.SmallIntegerField( choices=VOTE_CHOICES )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('channel', 'user')

    @property
    def likes_count(self):
        return self.votes.filter(vote=1).count()

    @property
    def dislikes_count(self):
        return self.votes.filter(vote=-1).count()


class Recording(models.Model):
    id = models.AutoField(primary_key=True, db_column='ID')
    user = models.ForeignKey( User, db_column='user_id', on_delete=models.CASCADE, related_name='recordings' )
    record_img = models.CharField(max_length=255, blank=True, null=True)
    record_name = models.CharField(max_length=30)
    record_file = models.FileField(upload_to=record_file_upload_path, null=True, blank=True)
    record_folder = models.CharField(max_length=500, blank=True, null=True)
    record_channel = models.ForeignKey( Channel, on_delete=models.CASCADE, related_name='record_channel' )
    native_language = models.ForeignKey(Language, db_column='nat_id', on_delete=models.CASCADE, related_name='record_native')
    record_private = models.BooleanField(default=False)
    is_favorite = models.BooleanField(default=False, db_column='record_is_favorite')
    record_lesson = models.ForeignKey(Lesson, db_column='lesson_id', on_delete=models.SET_NULL, null=True, blank=True)
    duration = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    tags = models.ManyToManyField(Tag, blank=True, related_name='record_tags' )

    def __str__(self):
        return f"{self.created_at}"
    
    def delete(self, *args, **kwargs):
        try:
            if self.record_file and os.path.isfile(self.record_file.path):
                os.remove(self.record_file.path)
        except Exception:
            pass
        try:
            if self.record_img:
                thumb_path = os.path.join( settings.MEDIA_ROOT, self.record_img.replace("/media/", "") )

                if os.path.isfile(thumb_path):
                    os.remove(thumb_path)
        except Exception:
            pass

        super().delete(*args, **kwargs)

