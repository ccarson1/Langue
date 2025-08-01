
from django.contrib import admin
from .models import Document, Editor, Language, Phrase, PhraseTranslation, Report, UserWord, Word, WordTranslation, Profile

admin.site.register(Language)
admin.site.register(Editor)
admin.site.register(Word)
admin.site.register(WordTranslation)
admin.site.register(Profile)
admin.site.register(UserWord)
admin.site.register(Report)
admin.site.register(Document)
admin.site.register(Phrase)
admin.site.register(PhraseTranslation)
