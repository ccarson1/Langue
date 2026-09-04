import os
import yt_dlp
from yt_dlp.utils import DownloadError
from pydub import AudioSegment
import whisper
import webvtt
import json
from api.models import Sentence, Lesson, Language
from .w_translate import load_user_model, translate_word
from django.conf import settings
import uuid
from django.core.files import File
from .utils.storage import StorageManager

class URL_VTT():
    
    def __init__(self, YOUTUBE_URL, lesson_id, lesson_language_id, translate_language_id, lesson_uuid, lesson_import_progress, user_id, alwaysGenerateCaptions, videoFormat, translateTarget):
        
        def normalize_youtube_url(url):
            if "youtube.com/shorts/" in url:
                video_id = url.split("/shorts/")[1].split("?")[0]
                return f"https://www.youtube.com/watch?v={video_id}"
            return url
        

        self.uuid = str(lesson_uuid)
        self.AUDIO_FILE = os.path.join(settings.MEDIA_ROOT, "lessons", self.uuid, f"{self.uuid}.mp3")
        self.VIDEO_FILE = os.path.join(settings.MEDIA_ROOT, "lessons", self.uuid, f"{self.uuid}.mp4")
        self.YOUTUBE_URL = normalize_youtube_url(YOUTUBE_URL)

        self.OUTPUT_DIR = os.path.join(settings.MEDIA_ROOT, "lessons", self.uuid)
        self.AUDIO_DIR = self.OUTPUT_DIR 
        #self.METADATA_PATH = os.path.join(self.OUTPUT_DIR, "metadata.csv")
        self.NATIVE_CAPTIONS_FILE = os.path.join( self.OUTPUT_DIR, "captions_native.vtt" )
        self.TARGET_CAPTIONS_FILE = os.path.join( self.OUTPUT_DIR, "captions_target.vtt" )
        self.lesson_language = lesson_language_id
        self.translate_language = translate_language_id
        self.lesson_id = lesson_id
        self.alwaysGenerateCaptions = alwaysGenerateCaptions
        self.videoFormat = videoFormat
        self.translateTarget = translateTarget

        #self.lesson_json ={'title': '', 'audio_files': []}
        os.makedirs(self.OUTPUT_DIR, exist_ok=True)


        self.lesson = Lesson.objects.get(id=self.lesson_id)
        self.native_id = Language.objects.get(id=self.lesson_language)
        self.target_id = Language.objects.get(id=self.translate_language)

        self.yt_dlp_lang = self.native_id.yt_dlp_lang
        self.yt_dlp_tar_lang = self.target_id.yt_dlp_lang

        self.lesson_import_progress = lesson_import_progress
        self.user_id = user_id

        print(f"Lesson language: {self.yt_dlp_lang}")
        print(f"Translate language: {self.yt_dlp_tar_lang}")

    def delete_caption_files(self):
        caption_files = [
            self.NATIVE_CAPTIONS_FILE,
            self.TARGET_CAPTIONS_FILE,
        ]

        for caption_file in caption_files:
            if os.path.exists(caption_file):
                try:
                    os.remove(caption_file)
                    print(f"Deleted temporary VTT: {caption_file}")
                except OSError as e:
                    print(
                        f"WARNING: Could not delete temporary VTT "
                        f"{caption_file}: {e}"
                    )

    def download_media_and_captions(self, url, videoFormat):

        # --------------------------------------------------
        # 1. Download media ONLY
        # --------------------------------------------------

        if videoFormat:
            media_opts = {
                "format": "bv*+ba/b",
                "merge_output_format": "mp4",
                "outtmpl": self.VIDEO_FILE,
                "quiet": True,
            }
        else:
            media_opts = {
                "format": "bestaudio/best",
                "outtmpl": self.AUDIO_FILE,
                "quiet": True,
            }

        try:
            with yt_dlp.YoutubeDL(media_opts) as ydl:
                info_dict = ydl.extract_info(url, download=True)

            title = info_dict.get("title", "unknown_title")
            print(f"Video title: {title}")

            media_file = ( self.VIDEO_FILE if videoFormat else self.AUDIO_FILE )

            StorageManager.add_file( self.lesson.user, media_file )

        except DownloadError as e:
            return {
                "success": False,
                "error": str(e),
                "native_subtitle": False,
                "target_subtitle": False
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "native_subtitle": False,
                "target_subtitle": False
            }

        self.lesson_import_progress[self.user_id] = 15

        # --------------------------------------------------
        # 2. Download subtitles independently
        # --------------------------------------------------

        native_found = False
        target_found = False

        subtitle_languages = []

        if self.yt_dlp_lang:
            subtitle_languages.append(
                ("native", self.yt_dlp_lang)
            )

        if (
            self.yt_dlp_tar_lang
            and self.yt_dlp_tar_lang != self.yt_dlp_lang
        ):
            subtitle_languages.append(
                ("target", self.yt_dlp_tar_lang)
            )

        for subtitle_type, language in subtitle_languages:

            print(
                f"Attempting {subtitle_type} subtitles: {language}"
            )

            subtitle_opts = {
                "skip_download": True,
                "writesubtitles": True,
                "writeautomaticsub": True,
                "subtitleslangs": [language],
                "subtitlesformat": "vtt",
                "outtmpl": os.path.join(
                    self.OUTPUT_DIR,
                    "%(id)s.%(language)s.%(ext)s"
                ),
                "quiet": True,
            }

            try:
                with yt_dlp.YoutubeDL(subtitle_opts) as ydl:
                    ydl.download([url])

                print(
                    f"Successfully downloaded "
                    f"{subtitle_type} subtitles: {language}"
                )

            except DownloadError as e:
                print(
                    f"WARNING: Could not download "
                    f"{subtitle_type} subtitles "
                    f"({language}): {e}"
                )
                print(
                    f"Continuing without {subtitle_type} subtitles..."
                )

            except Exception as e:
                print(
                    f"WARNING: Unexpected error downloading "
                    f"{subtitle_type} subtitles "
                    f"({language}): {e}"
                )
                print(
                    f"Continuing without {subtitle_type} subtitles..."
                )

        # --------------------------------------------------
        # 3. Find downloaded VTT files
        # --------------------------------------------------

        for filename in os.listdir(self.OUTPUT_DIR):

            if not filename.lower().endswith(".vtt"):
                continue

            source_path = os.path.join(
                self.OUTPUT_DIR,
                filename
            )

            filename_lower = filename.lower()

            # --------------------------------------------------
            # Native subtitle
            # --------------------------------------------------

            if (
                not native_found
                and (
                    f".{self.yt_dlp_lang.lower()}." in filename_lower
                    or filename_lower.endswith(
                        f".{self.yt_dlp_lang.lower()}.vtt"
                    )
                )
            ):

                os.replace(
                    source_path,
                    self.NATIVE_CAPTIONS_FILE
                )

                native_found = True

                print(
                    f"Native subtitles found: {filename}"
                )

            # --------------------------------------------------
            # Target subtitle
            # --------------------------------------------------

            elif (
                not target_found
                and (
                    f".{self.yt_dlp_tar_lang.lower()}." in filename_lower
                    or filename_lower.endswith(
                        f".{self.yt_dlp_tar_lang.lower()}.vtt"
                    )
                )
            ):

                os.replace(
                    source_path,
                    self.TARGET_CAPTIONS_FILE
                )

                target_found = True

                print(
                    f"Target subtitles found: {filename}"
                )

        print(
            f"Native subtitles available: {native_found}"
        )

        print(
            f"Target subtitles available: {target_found}"
        )

        return {
            "success": True,
            "native_subtitle": native_found,
            "target_subtitle": target_found
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

    def split_segments(self, segments, target_segments=None):

        load_user_model(self.user_id)

        total_sentence_storage = 0

        for idx, seg in enumerate(segments):

            start_ms = int(seg["start"] * 1000)
            end_ms = int(seg["end"] * 1000)

            text = seg["text"]

            translated_text = ""

            # --------------------------------------------------
            # Try to find matching target subtitle
            # --------------------------------------------------

            if target_segments:

                best_match = None
                best_overlap = 0

                for target in target_segments:

                    target_start = target["start"]
                    target_end = target["end"]

                    # Calculate timestamp overlap
                    overlap_start = max(
                        seg["start"],
                        target_start
                    )

                    overlap_end = min(
                        seg["end"],
                        target_end
                    )

                    overlap = max(
                        0,
                        overlap_end - overlap_start
                    )

                    if overlap > best_overlap:

                        best_overlap = overlap
                        best_match = target

                if best_match:

                    translated_text = best_match["text"]

            # --------------------------------------------------
            # Target subtitle wasn't available/matched
            # --------------------------------------------------

            if not translated_text and self.translateTarget:

                translated_text = translate_word(
                    text,
                    self.yt_dlp_lang,
                    self.yt_dlp_tar_lang
                )

            # --------------------------------------------------
            # Save sentence
            # --------------------------------------------------

            sentence = Sentence.objects.create(
                sentence=text,
                start_ms=start_ms,
                end_ms=end_ms,
                translated_sentence=translated_text,
                lesson_language=self.native_id,
                translate_language=self.target_id,
                lesson=self.lesson
            )

            # Calculate storage used by this sentence
            total_sentence_storage += ( len(text.encode("utf-8")) + len(translated_text.encode("utf-8")) )

            # Progress
            if self.translateTarget:

                self.lesson_import_progress[ self.user_id ] += 70 / len(segments)
                print( f"Progress: " f"{self.lesson_import_progress[self.user_id]}%" )


        return total_sentence_storage
    
    def save_to_json(self, data):
        with open(f"{self.OUTPUT_DIR}/{data['title']}.json", 'w', encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)



    def process_lesson(self):

        try:

            print("Downloading audio and captions...")

            subtitle_result = self.download_media_and_captions(
                self.YOUTUBE_URL,
                self.videoFormat
            )

            if not subtitle_result["success"]:
                raise Exception(
                    subtitle_result["error"]
                )

            native_subtitle_found = subtitle_result["native_subtitle"]
            target_subtitle_found = subtitle_result["target_subtitle"]

            # --------------------------------------------------
            # Make sure audio exists
            # --------------------------------------------------

            if self.videoFormat:

                if not os.path.exists(self.VIDEO_FILE):
                    print("ERROR: Video file missing.")
                    raise Exception(
                        "Video file missing after download"
                    )

                os.makedirs(
                    os.path.dirname(self.AUDIO_FILE),
                    exist_ok=True
                )

                AudioSegment.from_file(
                    self.VIDEO_FILE
                ).export(
                    self.AUDIO_FILE,
                    format="mp3"
                )

                StorageManager.add_file(
                    self.lesson.user,
                    self.AUDIO_FILE
                )

            else:

                if not os.path.exists(self.AUDIO_FILE):
                    print("ERROR: Audio file missing.")
                    raise Exception(
                        "Audio file missing after download"
                    )

            # --------------------------------------------------
            # Get native/source segments
            # --------------------------------------------------

            if native_subtitle_found:

                print(
                    "Using downloaded native subtitles..."
                )

                segments = self.parse_vtt_to_segments(
                    self.NATIVE_CAPTIONS_FILE
                )

            else:

                print(
                    "Native subtitles unavailable."
                )

                print(
                    "Generating native captions with Whisper..."
                )

                model = whisper.load_model("small")

                result = model.transcribe(
                    self.AUDIO_FILE
                )

                segments = [
                    {
                        "start": seg["start"],
                        "end": seg["end"],
                        "text": seg["text"]
                    }
                    for seg in result["segments"]
                ]

            print(
                f"Found {len(segments)} native segments."
            )

            # --------------------------------------------------
            # Get target translations
            # --------------------------------------------------

            target_segments = None

            if target_subtitle_found:

                print(
                    "Using downloaded target subtitles..."
                )

                target_segments = self.parse_vtt_to_segments(
                    self.TARGET_CAPTIONS_FILE
                )

                print(
                    f"Found {len(target_segments)} target segments."
                )

            else:

                print(
                    "Target subtitles unavailable."
                )

                print(
                    "Target language will be generated by translation."
                )

            # --------------------------------------------------
            # Create database sentences
            # --------------------------------------------------

            total_sentence_storage = self.split_segments( segments, target_segments )

            # --------------------------------------------------
            # Add sentence database storage
            # --------------------------------------------------

            StorageManager.add_object( self.lesson.user, "database/sentences", total_sentence_storage )
            # --------------------------------------------------
            # Save media_file
            # --------------------------------------------------

            filename = (
                self.VIDEO_FILE
                if self.videoFormat
                else self.AUDIO_FILE
            )

            print("Saving file:", filename)
            print("Exists:", os.path.exists(filename))
            print("Lesson ID:", self.lesson.id)

            if self.videoFormat:
                media_name = (
                    f"lessons/{self.uuid}/{self.uuid}.mp4"
                )
            else:
                media_name = (
                    f"lessons/{self.uuid}/{self.uuid}.mp3"
                )

            print(
                "BEFORE ASSIGNMENT:",
                repr(self.lesson.media_file.name)
            )

            self.lesson.media_file.name = media_name

            print(
                "AFTER ASSIGNMENT:",
                repr(self.lesson.media_file.name)
            )

            self.lesson.media_folder = (
                f"lessons/{self.uuid}"
            )

            self.lesson.save()

            self.lesson.refresh_from_db()

            print(
                "AFTER DATABASE SAVE:",
                repr(self.lesson.media_file.name)
            )

            print(
                "AFTER DATABASE FOLDER:",
                repr(self.lesson.media_folder)
            )

            print("Done!")
            print("PROCESS COMPLETED SUCCESSFULLY")

            return True

        finally:

            # --------------------------------------------------
            # ALWAYS clean up temporary VTT files
            # --------------------------------------------------

            self.delete_caption_files()
