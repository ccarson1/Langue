import os
import json
from .models import User, Language, UserSetting
from rest_framework.response import Response
from django.conf import settings

class DictionaryLookup():

    def __init__(self, target_language, user_dictionary, text, user):

        self.user_dictionary = user_dictionary
        self.text = text
        user_settings = UserSetting.objects.get(user=user)
        lang_code = user_settings.target_language.yt_dlp_lang
        print('Settings BASE_DIR', settings.BASE_DIR)
        self.dictionary_path = os.path.join(user_dictionary.path)
        


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



