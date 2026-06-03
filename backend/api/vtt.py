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

class VTT():
    
    def __init__(self, lesson_file, audio_file, lesson_id, lesson_language_id, translate_language_id):
        
        self.uuid = str(uuid.uuid4())
        self.AUDIO_FILE = os.path.join(settings.MEDIA_ROOT, "lessons", self.uuid, "audio.mp3")
        self.lesson_file = lesson_file
        self.audio_file = audio_file
        print(type(lesson_file))
        print(type(audio_file))
        
        
        
        self.OUTPUT_DIR = os.path.join(settings.MEDIA_ROOT, "lessons", self.uuid)
        self.AUDIO_DIR = os.path.join(self.OUTPUT_DIR, "audio")
        #self.METADATA_PATH = os.path.join(self.OUTPUT_DIR, "metadata.csv")
        self.CAPTIONS_FILE = os.path.join(self.OUTPUT_DIR, "captions.vtt")
        self.lesson_language = lesson_language_id
        self.translate_language = translate_language_id
        self.lesson_id = lesson_id

        #self.lesson_json ={'title': '', 'audio_files': []}
        os.makedirs(self.OUTPUT_DIR, exist_ok=True)
        os.makedirs(self.AUDIO_DIR, exist_ok=True)
        
        
    def split_audio_by_csv_ms(self, audio_path=None, csv_path=None, output_dir=None):
        if output_dir is None:
            output_dir = self.AUDIO_DIR
        if audio_path is None:
            audio_path = self.AUDIO_FILE
        if csv_path is None:
            raise ValueError("csv_path must be provided and must be a file path")
        
        audio = AudioSegment.from_file(audio_path)
        os.makedirs(output_dir, exist_ok=True)
        
        def sanitize_filename_component(s):
            s = s.strip()
            # Replace spaces and tabs with underscore
            s = re.sub(r'[\s]+', '_', s)
            # Remove all characters except alphanumerics, underscore, dash
            s = re.sub(r'[^\w\-]', '', s)
            return s

        with open(csv_path, newline='', encoding='utf-8-sig') as csvfile:
            reader = csv.DictReader(csvfile)
            for i, row in enumerate(reader):
                try:
                    start_ms = int(row['start_ms'].strip())
                    end_ms = int(row['end_ms'].strip())
                except (ValueError, AttributeError) as e:
                    print(f"Skipping invalid row {i+1}: {row} ({e})")
                    continue

                # Validate start and end times
                if start_ms >= end_ms or start_ms < 0 or end_ms > len(audio):
                    print(f"Skipping out-of-range or invalid segment at row {i+1}: start={start_ms}, end={end_ms}")
                    continue

                segment = audio[start_ms:end_ms]
                
                # Use native and target columns for filenames (sanitize)
                native = sanitize_filename_component(row.get('native', ''))
                target = sanitize_filename_component(row.get('target', ''))

                if native == '' or None:
                    native = translate_word(target)

                filename = f"segment_{i+1:03d}_{native}_{target}.wav"
                filepath = os.path.join(output_dir, filename)
                segment.export(filepath, format="wav")
                print(f"Exported {filename} from {start_ms}ms to {end_ms}ms")

                lesson = Lesson.objects.get(id=self.lesson_id)
                native_id = Language.objects.get(lang_name=self.lesson_language)
                target_id = Language.objects.get(lang_name=self.translate_language)

                sentence = Sentence.objects.create(
                    audio_file=filename,
                    sentence=target,
                    start_ms=start_ms,
                    end_ms=end_ms,
                    translated_sentence=native,
                    lesson_language=native_id,
                    translate_language=target_id,
                    lesson=lesson
                )
                
                sentence.save()
                
    def save_csv(self, uploaded_file):
        os.makedirs(self.OUTPUT_DIR, exist_ok=True)
        csv_path = os.path.join(self.OUTPUT_DIR, f"{self.uuid}.csv")
        with open(csv_path, 'wb') as f:
            f.write(uploaded_file.read())
        return csv_path
            
    def save_audio_as_mp3(self, uploaded_audio):
        audio_bytes = uploaded_audio.read()
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes))  # auto-detect format


        os.makedirs(os.path.dirname(self.AUDIO_FILE), exist_ok=True)
        audio.export(self.AUDIO_FILE, format="mp3")
        