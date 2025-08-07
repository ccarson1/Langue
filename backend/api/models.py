from django.db import models
from django.db.models import JSONField # Use if on PostgreSQL; else see notes below
from django.utils import timezone
from django.contrib.auth.models import User
import uuid


def lesson_file_upload_path(instance, filename):
    return f'lessons/user_{instance.user.id}/{instance.uuid}/files/{filename}'

def audio_file_upload_path(instance, filename):
    return f'lessons/user_{instance.user.id}/{instance.uuid}/audio/{filename}'

def image_file_upload_path(instance, filename):
    return f'lessons/user_{instance.user.id}/{instance.uuid}/image/{filename}'

class Language(models.Model):
    id = models.AutoField(primary_key=True, db_column='ID')
    lang_name = models.CharField(max_length=25, unique=True)

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
    frequency = models.DecimalField(max_digits=5, decimal_places=3, default=0.000)
    creation_date = models.DateField(default=timezone.now)
    review_date = models.DateField(blank=True, null=True)
    user = models.ForeignKey(User, db_column='user_id', on_delete=models.CASCADE)

    class Meta:
        db_table = 'User_Words'


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
    audio_file = models.FileField(upload_to=audio_file_upload_path, null=True, blank=True)
    audio_folder = models.CharField(max_length=500, blank=True, null=True)
    image = models.ImageField(upload_to='images/', null=True, blank=True, default='images/default-01.jpg')
    user = models.ForeignKey(User, db_column='user_id', on_delete=models.CASCADE)
    title = models.CharField(max_length=100, blank=True, null=True)
    url = models.URLField(max_length=1000, blank=True, null=True)
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    native_language = models.CharField(max_length=50)
    target_language = models.CharField(max_length=50)
    lesson_private = models.BooleanField(default=False)
    audioUploaded = models.BooleanField(default=False)
    fileUploaded = models.BooleanField(default=False)
    urlReference = models.BooleanField(default=False)
    
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
        
class UserSetting(models.Model):
    id = models.AutoField(primary_key=True, db_column='ID')
    user = models.ForeignKey(User, db_column='user_ID', on_delete=models.CASCADE)
    native_language = models.ForeignKey(Language, db_column='nat_id', on_delete=models.CASCADE, related_name='settings_translations_native')
    target_language = models.ForeignKey(Language, db_column='tar_id', on_delete=models.CASCADE, related_name='settings_translations_target')
    notifications = models.BooleanField(default=True, db_column='notifications')
    
class Sentence(models.Model):
    id = models.AutoField(primary_key=True, db_column='ID')
    audio_file = models.CharField(max_length=50)
    sentence = models.CharField(max_length=250)
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
    current_lesson = models.ForeignKey(UserLessonsProgress, db_column='lesson_progress', on_delete=models.SET_NULL, null=True)

    # For languages field:
    # If you use PostgreSQL, you can use JSONField as below.
    # If not, consider using TextField with JSON serialization/deserialization in code.
    languages = JSONField(blank=True, null=True)

    class Meta:
        db_table = 'Profile'

