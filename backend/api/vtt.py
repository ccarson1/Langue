import os
import yt_dlp
from pydub import AudioSegment

import webvtt
import json
from api.models import Sentence, Lesson, Language
from .w_translate import translate_word
from django.conf import settings
import uuid

class VTT():
    
    def __init__(self, YOUTUBE_URL, lesson_id, lesson_language_id, translate_language_id):
        

        self.AUDIO_FILE = "audio.m4a"
        self.YOUTUBE_URL = YOUTUBE_URL
        self.uuid = str(uuid.uuid4())
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

    def download_audio_and_captions(self, url, audio_path="audio.m4a", subtitle_path="captions.vtt"):
        ydl_opts = {
            "format": "bestaudio[ext=m4a]/bestaudio",
            "outtmpl": audio_path,
            'sleep_interval': 3, 
            'max_sleep_interval': 5,
            "quiet": True,
            "writesubtitles": True,
            "writeautomaticsub": True,
            "subtitleslangs": ["lt"],
            "subtitlesformat": "vtt",
            "skip_download": False,
            "paths": {
                "subtitle": self.OUTPUT_DIR,
            }
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=True)
            title = info_dict.get("title", "unknown_title")
            print(f"Video title: {title}")
            #self.lesson_json["title"] = title
            ydl.download([url])

        # Move subtitles to the desired path
        for file in os.listdir(self.OUTPUT_DIR):
            if file.endswith(".vtt"):
                os.rename(os.path.join(self.OUTPUT_DIR, file), subtitle_path)
                break

    def parse_vtt_to_segments(self, vtt_path):
        segments = []
        for caption in webvtt.read(vtt_path):
            start = self.time_to_seconds(caption.start)
            end = self.time_to_seconds(caption.end)
            text = caption.text.strip().replace("\n", " ")
            if text:
                segments.append({"start": start, "end": end, "text": text})
        return segments

    def time_to_seconds(self, time_str):
        h, m, s = time_str.split(":")
        s, ms = map(float, s.split('.'))
        return int(h) * 3600 + int(m) * 60 + s + ms / 1000

    def split_audio_segments(self, audio_path, segments):
        audio = AudioSegment.from_file(audio_path)
        metadata = []
        
        lesson = Lesson.objects.get(id=self.lesson_id)
        native_id = Language.objects.get(lang_name=self.lesson_language)
        target_id = Language.objects.get(lang_name=self.translate_language)

        
        for idx, seg in enumerate(segments):
            start_ms = int(seg["start"] * 1000)
            end_ms = int(seg["end"] * 1000)
            text = seg["text"]

            # Optional padding
            pad_before = 200
            pad_after = 300
            s = max(0, start_ms - pad_before)
            e = min(len(audio), end_ms + pad_after)

            chunk = audio[s:e]
            filename = f"{idx+1:03d}.wav"
            print(filename)
            #self.lesson_json["audio_files"].append(filename)
            filepath = os.path.join(self.AUDIO_DIR, filename)
            chunk.export(filepath, format="wav")
            
            translated_text = translate_word(text)

            print(f"Here is the lesson_language: {self.lesson_language}")
            print(f"Here is the translate_language: {self.translate_language}")
            
            sentence = Sentence.objects.create(
                audio_file=filename,
                sentence=text,
                translated_sentence=translated_text,
                lesson_language=native_id,
                translate_language=target_id,
                lesson=lesson
            )
            
            sentence.save()



    def save_to_json(self, data):
        with open(f"{self.OUTPUT_DIR}/{data['title']}.json", 'w', encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def process_lesson(self):
        print("Downloading audio and captions...")
        self.download_audio_and_captions(self.YOUTUBE_URL, self.AUDIO_FILE, self.CAPTIONS_FILE)



        if not os.path.exists(self.AUDIO_FILE) or not os.path.exists(self.CAPTIONS_FILE):
            print("ERROR: Audio or captions file missing.")
            return

        print("Parsing captions...")
        segments = self.parse_vtt_to_segments(self.CAPTIONS_FILE)
        print(f"Found {len(segments)} caption segments.")

        print("Splitting audio...")
        self.split_audio_segments(self.AUDIO_FILE, segments)

        #print("Saving metadata.csv...")
        #pd.DataFrame(metadata).to_csv(self.METADATA_PATH, sep="|", index=False, header=False)
        print("Done!")

        #save_to_json(lesson_json)

