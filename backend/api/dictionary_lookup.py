import os
import json
from .models import User, Language, UserSetting
from rest_framework.response import Response
from django.conf import settings

class DictionaryLookup():

    def __init__(self, target_language, dictionary_name, text, user):

        self.dictionary_name = dictionary_name
        self.text = text
        user_settings = UserSetting.objects.get(user=user)
        lang_code = user_settings.target_language.yt_dlp_lang
        self.dictionary_path = os.path.join(settings.BASE_DIR, 'dictionaries', lang_code, dictionary_name)
        


    def dic_json_lookup(self):

            print(self.dictionary_path)

            with open(self.dictionary_path, 'r', encoding='utf-8') as f:
                dictionary_data = json.load(f)

            search_word = self.text.strip().lower()

            for entry in dictionary_data:

                dict_word = entry.get(
                    'word',
                    ''
                ).strip().lower()

                if dict_word == search_word:

                    definition = entry.get(
                        'definition',
                        ''
                    ).strip()
                    print(f"Found in dictionary: {dict_word} -> {definition}")
                    if definition:

                        return [definition]


