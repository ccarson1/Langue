import os
import yt_dlp
from yt_dlp.utils import DownloadError
from pydub import AudioSegment
import whisper
import webvtt
import json
from api.models import Sentence, Lesson, Language
from .w_translate import translate_word
from django.conf import settings
import uuid

class URL_VTT():
    
    def __init__(self, YOUTUBE_URL, lesson_id, lesson_language_id, translate_language_id, lesson_import_progress, user_id):
        
        def normalize_youtube_url(url):
            if "youtube.com/shorts/" in url:
                video_id = url.split("/shorts/")[1].split("?")[0]
                return f"https://www.youtube.com/watch?v={video_id}"
            return url
        

        self.uuid = str(uuid.uuid4())
        self.AUDIO_FILE = os.path.join(settings.MEDIA_ROOT, "lessons", self.uuid, "audio.mp3")
        self.YOUTUBE_URL = normalize_youtube_url(YOUTUBE_URL)

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

        self.lesson = Lesson.objects.get(id=self.lesson_id)
        self.native_id = Language.objects.get(id=self.lesson_language)
        self.target_id = Language.objects.get(id=self.translate_language)

        self.yt_dlp_lang = self.native_id.yt_dlp_lang
        self.yt_dlp_tar_lang = self.target_id.yt_dlp_lang

        self.lesson_import_progress = lesson_import_progress
        self.user_id = user_id

        print(f"Lesson language: {self.yt_dlp_lang}")
        print(f"Translate language: {self.yt_dlp_tar_lang}")


    def download_audio_and_captions(self, url, audio_path, subtitle_path):

        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": audio_path,
            "quiet": True,
            "writesubtitles": True,
            "writeautomaticsub": True,
            "subtitleslangs": [self.yt_dlp_lang],
            "subtitlesformat": "vtt",
            "skip_download": False,
            "paths": {"subtitle": self.OUTPUT_DIR},
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info_dict = ydl.extract_info(url, download=True)

            title = info_dict.get("title", "unknown_title")
            print(f"Video title: {title}")

        except DownloadError as e:
            return {"error": str(e)}

        except Exception as e:
            return {"error": str(e)}

        self.lesson_import_progress[self.user_id] = 15

        # move subtitle file safely
        subtitle_found = False
        for file in os.listdir(self.OUTPUT_DIR):
            if file.endswith(".vtt"):
                os.rename(
                    os.path.join(self.OUTPUT_DIR, file),
                    subtitle_path
                )
                subtitle_found = True
                break

        return {
            "success": True,
            "subtitle_found": subtitle_found
        }

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
            
            translated_text = translate_word(text, self.yt_dlp_lang, self.yt_dlp_tar_lang)

            self.lesson_import_progress[self.user_id] += 70 / len(segments)
            print(f"Progress: {self.lesson_import_progress[self.user_id]}%")

            print(f"Here is the lesson_language: {self.lesson_language}")
            print(f"Here is the translate_language: {self.translate_language}")

            relative_path = f"lessons/{self.uuid}/audio/{filename}"
            
            sentence = Sentence.objects.create(
                audio_file=relative_path,
                sentence=text,
                start_ms=start_ms,
                end_ms=end_ms,
                translated_sentence=translated_text,
                lesson_language=self.native_id,
                translate_language=self.target_id,
                lesson=self.lesson
            )
            
            sentence.save()



    def save_to_json(self, data):
        with open(f"{self.OUTPUT_DIR}/{data['title']}.json", 'w', encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)



    def process_lesson(self):
        print("Downloading audio and captions...")
        self.download_audio_and_captions(self.YOUTUBE_URL, self.AUDIO_FILE, self.CAPTIONS_FILE)

        if not os.path.exists(self.AUDIO_FILE):
            print("ERROR: Audio file missing.")
            raise Exception("Audio file missing after download")
            

        if os.path.exists(self.CAPTIONS_FILE):
            print("Parsing captions...")
            segments = self.parse_vtt_to_segments(self.CAPTIONS_FILE)
            print(f"Found {len(segments)} caption segments.")
        else:
            print("Captions missing, generating with Whisper...")
            
            model = whisper.load_model("small")
            result = model.transcribe(self.AUDIO_FILE)
            segments = [{"start": seg["start"], "end": seg["end"], "text": seg["text"]} for seg in result["segments"]]
            print(f"Generated {len(segments)} segments using Whisper.")

        print("Splitting audio...")
        self.split_audio_segments(self.AUDIO_FILE, segments)
        self.lesson.audio_file.name = f"lessons/{self.uuid}/audio.mp3"
        self.lesson.audio_folder = f"media/lessons/{self.uuid}/audio"
        self.lesson.save()
        print("Done!")
        print("PROCESS COMPLETED SUCCESSFULLY")
        return True


