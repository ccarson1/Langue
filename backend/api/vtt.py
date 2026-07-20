import os
from pydub import AudioSegment

import webvtt
import json
from api.models import Sentence, Lesson, Language
from .w_translate import translate_word
from django.conf import settings
import uuid
from pydub import AudioSegment
import csv
import os
import io
import re
from .stt import SpeechToText

class VTT():
    
    def __init__(self, lesson_file, lesson_id, lesson_language_id, translate_language_id, lesson_import_progress, user_id, alwaysGenerateCaptions, videoFormat, media_file, translateTarget):
        
        self.uuid = str(uuid.uuid4())
        self.AUDIO_FILE = os.path.join(settings.MEDIA_ROOT, "lessons", self.uuid, "audio.mp3")
        self.VIDEO_FILE = os.path.join(settings.MEDIA_ROOT, "lessons", self.uuid, "video.mp4")
        self.lesson_file = lesson_file
        self.media_file = media_file
        print(type(lesson_file))
        print(type(media_file))
        
        
        
        self.OUTPUT_DIR = os.path.join(settings.MEDIA_ROOT, "lessons", self.uuid)
        self.AUDIO_DIR = self.OUTPUT_DIR 
        #self.METADATA_PATH = os.path.join(self.OUTPUT_DIR, "metadata.csv")
        self.CAPTIONS_FILE = os.path.join(self.OUTPUT_DIR, "captions.vtt")
        self.lesson_language = lesson_language_id
        self.translate_language = translate_language_id
        self.lesson_id = lesson_id
        self.alwaysGenerateCaptions = alwaysGenerateCaptions
        self.videoFormat = videoFormat
        self.translateTarget = translateTarget

        #self.lesson_json ={'title': '', 'audio_files': []}
        os.makedirs(self.OUTPUT_DIR, exist_ok=True)

        print("Lesson Language:", self.lesson_language)
        print("Translate Language: ", self.translate_language)

        self.lesson = Lesson.objects.get(id=self.lesson_id)
        self.native_id = Language.objects.get(id=self.lesson_language)
        self.target_id = Language.objects.get(id=self.translate_language)

        self.yt_dlp_lang = self.native_id.yt_dlp_lang
        self.yt_dlp_tar_lang = self.target_id.yt_dlp_lang

        self.lesson_import_progress = lesson_import_progress
        self.user_id = user_id

        


    def create_sentences(self, segments):
        for seg in segments:
            start_ms = int(seg["start"] * 1000)
            end_ms = int(seg["end"] * 1000)

            text = seg["text"]

            if self.translateTarget:
                translated = translate_word(
                    text,
                    self.yt_dlp_lang,
                    self.yt_dlp_tar_lang
                )
            else:
                translated = seg["translated"]

            self.lesson_import_progress[self.user_id] += 70 / len(segments)
            print(f"Progress: {self.lesson_import_progress[self.user_id]}%")
            print(f"Here is the lesson_language: {self.lesson_language}")
            print(f"Here is the translate_language: {self.translate_language}")

            Sentence.objects.create(
                sentence=text,
                start_ms=start_ms,
                end_ms=end_ms,
                translated_sentence=translated,
                lesson_language=self.native_id,
                translate_language=self.target_id,
                lesson=self.lesson
            )

    def process_lesson(self):

        stt = SpeechToText()

        print("Media_file:", self.media_file)

        if self.media_file:
            if self.videoFormat:
                self.save_media(self.media_file, 'mp4')
            self.save_media(self.media_file, 'mp3')

        #Load CSV file
        if self.lesson_file:
            csv_path = self.save_csv(self.lesson_file)
            print("CSV Path: ", csv_path)
            segments = self.csv_to_segments(csv_path)
            print("Segments: ", segments)
        elif self.alwaysGenerateCaptions:
            segments_with_info = stt.transcribe_with_timestamps(self.media_file, self.yt_dlp_lang)
            print("Uploaded Target Language: ", self.yt_dlp_lang)
            print("Language probability: ", segments_with_info['language'])
            print("Language Match: ", self.yt_dlp_lang == segments_with_info['language'])
            segments = segments_with_info['segments']
        else:
            segments = []

        self.create_sentences(segments)

        uuid_folder = self.uuid

        self.lesson.media_file.name = f"lessons/{uuid_folder}/audio.mp3"
        self.lesson.audio_folder = f"lessons/{uuid_folder}"
        self.lesson.save()

        return True
        
        
        
    def csv_to_segments(self, csv_path):
        segments = []

        with open(csv_path, newline='', encoding='utf-8-sig') as csvfile:
            reader = csv.DictReader(csvfile)

            print("Headers:", reader.fieldnames)

            for i, row in enumerate(reader, start=2):

                print(f"Row {i}: {row}")

                start = row.get("start_ms", "").strip()
                end = row.get("end_ms", "").strip()

                # Skip blank rows
                if not start or not end:
                    print(f"Skipping blank row {i}")
                    continue

                try:
                    start_ms = int(start)
                    end_ms = int(end)
                except ValueError:
                    print(f"Invalid numbers on row {i}")
                    continue

                native = row.get("native", "").strip()
                target = row.get("target", "").strip()

                if not native:
                    print("Translating existing target to generate native text...")
                    native = translate_word(
                        target,
                        self.target_id.yt_dlp_lang,
                        self.native_id.yt_dlp_lang
                    )


                segments.append({
                    "start": start_ms / 1000,
                    "end": end_ms / 1000,
                    "text": native,
                    "translated": target
                })

        return segments

    def save_csv(self, uploaded_file):
        os.makedirs(self.OUTPUT_DIR, exist_ok=True)
        csv_path = os.path.join(self.OUTPUT_DIR, f"{self.uuid}.csv")
        with open(csv_path, 'wb') as f:
            f.write(uploaded_file.read())
        return csv_path
            
    # def save_audio_as_mp3(self, uploaded_audio):
    #     audio_bytes = uploaded_audio.read()
    #     audio = AudioSegment.from_file(io.BytesIO(audio_bytes))  # auto-detect format


    #     os.makedirs(os.path.dirname(self.AUDIO_FILE), exist_ok=True)
    #     audio.export(self.AUDIO_FILE, format="mp3")
        
    def save_media(self, uploaded_audio, format_type):
        try:
            uploaded_audio.seek(0)  # IMPORTANT: reset stream
            audio = AudioSegment.from_file(uploaded_audio)
            os.makedirs(os.path.dirname(self.AUDIO_FILE), exist_ok=True)
            audio.export(self.AUDIO_FILE, format=format_type)
            return True

        except Exception as e:
            print("Audio conversion error:", str(e))
            return False