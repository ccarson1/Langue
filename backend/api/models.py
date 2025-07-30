from django.db import models
from django.db.models import JSONField # Use if on PostgreSQL; else see notes below
from django.utils import timezone

class Language(models.Model):
    id = models.AutoField(primary_key=True, db_column='ID')
    lang_name = models.CharField(max_length=25, unique=True)

    class Meta:
        db_table = 'Languages'

    def __str__(self):
        return self.lang_name


class User(models.Model):
    id = models.AutoField(primary_key=True, db_column='ID')
    username = models.CharField(max_length=60, unique=True)
    first_name = models.CharField(max_length=20, blank=True, null=True)
    last_name = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(max_length=100, unique=True)
    password = models.CharField(max_length=100)
    native_language = models.ForeignKey(Language, db_column='native_id', on_delete=models.SET_NULL, null=True, related_name='users_native')

    class Meta:
        db_table = 'Users'

    def __str__(self):
        return self.username


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


class Profile(models.Model):
    id = models.AutoField(primary_key=True, db_column='ID')
    user = models.ForeignKey(User, db_column='user_id', on_delete=models.CASCADE)
    profile_img = models.CharField(max_length=255, blank=True, null=True)
    streak = models.IntegerField(default=0)
    uploaded_docs = models.SmallIntegerField(default=0)
    creation_date = models.DateField(default=timezone.now)
    logged_hours = models.IntegerField(default=0)
    graph_type = models.CharField(max_length=20, blank=True, null=True)
    # For languages field:
    # If you use PostgreSQL, you can use JSONField as below.
    # If not, consider using TextField with JSON serialization/deserialization in code.
    languages = JSONField(blank=True, null=True)

    class Meta:
        db_table = 'Profile'


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


class Document(models.Model):
    id = models.AutoField(primary_key=True, db_column='ID')
    doc_file = models.BinaryField()
    user = models.ForeignKey(User, db_column='user_id', on_delete=models.CASCADE)

    class Meta:
        db_table = 'Documents'


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
