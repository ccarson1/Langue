# backend/api/views.py

from pathlib import Path
import subprocess

from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, parser_classes
from rest_framework import status
from django.contrib.auth.hashers import make_password
from django.contrib.auth.hashers import check_password
from django.db.models.functions import TruncDate
from .models import User, Language, UserSetting, Word, WordTranslation, Lesson, UserLessonsProgress, Profile, Sentence, UserWord, Channel, Recording, PhraseTranslation, AIModel, Tag, Dictionary, DictionaryEntry, UserLanguageLessonIndex, RSSFeed, ReadingLevel, ReadingLevelScale, GrammarCategory, GrammarTopic, GrammarLesson, GrammarExercise, GrammarAttempt, GrammarExerciseType, GrammarAudioTimestamp
from django.db.models import Q, Count
from rest_framework import generics
from .serializers import UserSerializer, SignupSerializer, LanguageSerializer, LessonSerializer, UserLessonsProgressSerializer, RecordingSerializer, AIModelSerializer
from django.views.generic import TemplateView
from .w_translate import load_user_model, translate_word
from.dictionary_lookup import DictionaryLookup
from.dictionary_scraper import DictionaryScraper
from django.core.files.storage import default_storage
from models.model_runner import synthesize_with_timestamps, synthesize_audio_bytes, get_tts_model_id
from django.http import FileResponse, Http404, JsonResponse
from rest_framework.views import APIView
from rest_framework.authentication import TokenAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from rest_framework.parsers import MultiPartParser, FormParser
import os
from django.conf import settings
from .url_vtt import URL_VTT
from .vtt import VTT
from django.utils import timezone
import requests
from django.core.files.base import ContentFile
from urllib.parse import urlparse, parse_qs
import uuid
import json
import shutil
from django.db import transaction
from pydub import AudioSegment
import numpy as np
import signal
import re
from datetime import timedelta
from .ocr import OCR
import base64
import random
from .utils.pronunciation_evaluator import evaluate_pronunciation
from .utils.storage import StorageManager
import io
import wave
import subprocess
from .rss_reader import RSSReader

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

lesson_import_progress = {}
RECORDINGS = {}

BASE_NEW_WORD_FREQUENCY = 5.0
WORD_INCREASE_FREQUENCY = 0.5
DICT_TYPES = ['file', 'website', 'ai']



@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def api_signup(request):
    print("Incoming data:", request.data)

    serializer = SignupSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({'message': 'Account created successfully!'}, status=status.HTTP_201_CREATED)

    print("Serializer errors:", serializer.errors)  # <-- key line
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@csrf_exempt
@api_view(['POST'])
def translate(request):
    text = request.data.get('text', '').strip().lower()
    nat_id = request.data.get('native_id', {}).get('id')
    tar_id = request.data.get('target_id', {}).get('id')

    user_setting = UserSetting.objects.filter(
        user=request.user
    ).first()

    user_dictionary = None

    if user_setting:
        user_dictionary = user_setting.user_dictionary
    
    print(f"Text: {text}")
    print(f"Native: {nat_id}")
    print(f"Target: {tar_id}")

    target_language = Language.objects.filter(
        id=tar_id
    ).first()
    native_language = Language.objects.filter(
        id=nat_id
    ).first()

    if not text or not nat_id or not tar_id:
        return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)

    word = Word.objects.filter(word=text, language_id=tar_id).first()

    print(f"Word found in DB: {word}")
    print(f"Word ID: {word.id if word else 'N/A'}")

    if word:
        translations = WordTranslation.objects.filter(
            word_id=word.id,
            native_language_id=nat_id,
            target_language_id=tar_id
        )

        dictionary = user_setting.user_dictionary

        if dictionary:
            dictionary_entry_exists = DictionaryEntry.objects.filter( word=word, dictionary=dictionary ).exists()
            dictionary_entry = DictionaryEntry.objects.filter( word=word, dictionary=dictionary ).first()

            if dictionary_entry:
                dictionary_scraper = dictionary_entry.data

        # Return an array of definitions
        definitions = [t.definition for t in translations]
        scraped_definitions = []
        print(f"Definitions from DB: {definitions}")
        print(f"Definitions IDs: {[t.id for t in translations]}")

        if user_dictionary.dic_type == DICT_TYPES[1] and user_setting.isScraperEnabled:
            print("Current Word: ", text)

            if dictionary_entry_exists:
                print("Dictionary entry found in database")
                response_data = dictionary_entry.data
                web_scraped = 0
            else:
                print("Dictionary entry not found - scraping")
                web_scraped = 1
                dictionary_scraper = DictionaryScraper(text, target_language.yt_dlp_lang, native_language.yt_dlp_lang)
                response_data = dictionary_scraper.scrape_lingea_dict(text, target_language.lang_name, native_language.lang_name)
                #response_data = { 'translated': response_data, 'inDatabase': 0, 'webScraped': 1}
            
    
                for part_of_speech in response_data.get('parts_of_speech', []):
                    scraped_definitions.extend(part_of_speech.get('definitions', []))
        else:
            response_data = {}
            web_scraped = 0

        response_data = { 'word_id': word.id, 'translated': definitions, 'scraped_definitions': scraped_definitions, 'dictionary_entry': response_data, 'dictionary_entry_exists': dictionary_entry_exists, 'inDatabase': 1, 'webScraped': web_scraped, 'translation_ids': [t.id for t in translations]}
        print(f"Response data: {response_data}")
        return Response(response_data)

    # -----------------------------------
    # DICTIONARY FALLBACK
    # -----------------------------------

    
    load_user_model(request.user)

    

    print(user_dictionary.name)
    print("Dictionary Type:", user_dictionary.dic_type)
    print(DICT_TYPES[0], DICT_TYPES[0] == 'file')
    print(DICT_TYPES[1], DICT_TYPES[1] == 'website')
    from pprint import pprint

    if user_dictionary.dic_type == DICT_TYPES[0]:
        dictionary_lookup = DictionaryLookup(target_language, user_dictionary, text, user=request.user)
        try:
            translated_text = dictionary_lookup.dic_json_lookup()
            print("Word from Dictionary lookup: ", translated_text)
            if not translated_text:
                translated_text = translate_word(text, src_lang=target_language.yt_dlp_lang, tgt_lang=native_language.yt_dlp_lang)
        except Exception as e:
            print('Dictionary lookup error:', e)

    elif user_dictionary.dic_type == DICT_TYPES[1] and user_setting.isScraperEnabled:
        print("Current Word: ", text)
        dictionary_scraper = DictionaryScraper(text, target_language.yt_dlp_lang, native_language.yt_dlp_lang)
        response_data = dictionary_scraper.scrape_lingea_dict(text, target_language.lang_name, native_language.lang_name)
        pprint(response_data)
        #response_data = { 'translated': response_data, 'inDatabase': 0, 'webScraped': 1}
        definitions = []
        scraped_definitions = []

        for part_of_speech in response_data.get('parts_of_speech', []):
            scraped_definitions.extend(part_of_speech.get('definitions', []))

        response_data = { 'translated': definitions, 'scraped_definitions': scraped_definitions, 'dictionary_entry': response_data, 'inDatabase': 0, 'webScraped': 1 }
        print(f"Response data: {response_data}")
        return Response(response_data)

    else:
        translated_text = translate_word(text, src_lang=target_language.yt_dlp_lang, tgt_lang=native_language.yt_dlp_lang)

    return Response({'translated': translated_text, 'inDatabase': 0, 'webScraped': 0})



def extract_youtube_video_id(url):
    parsed = urlparse(url)

    # youtube.com/watch?v=ID
    if "youtube.com" in parsed.netloc:
        if parsed.path == "/watch":
            return parse_qs(parsed.query).get("v", [None])[0]

        # youtube.com/shorts/ID
        if parsed.path.startswith("/shorts/"):
            return parsed.path.split("/shorts/")[1].split("/")[0]

        # youtube.com/embed/ID
        if parsed.path.startswith("/embed/"):
            return parsed.path.split("/embed/")[1].split("/")[0]

    # youtu.be/ID
    if "youtu.be" in parsed.netloc:
        return parsed.path.lstrip("/")

    return None



def download_youtube_image(url, lesson):
    print("DOWNLOAD FUNCTION CALLED")

    video_id = extract_youtube_video_id(url)
    print("VIDEO ID:", video_id)

    if not video_id:
        print("NO VIDEO ID FOUND")
        return False

    for quality in ["maxresdefault", "hqdefault"]:
        thumbnail_url = f"https://img.youtube.com/vi/{video_id}/{quality}.jpg"
        print("TRYING:", thumbnail_url)

        response = requests.get(thumbnail_url, timeout=10)
        print("STATUS:", response.status_code)

        if response.status_code == 200:
            image_content = ContentFile(response.content)
            filename = f"youtube_{video_id}.jpg"

            lesson.image.save(filename, image_content, save=True)
            print("FILE SAVED TO:", lesson.image.path)

            storage_object = StorageManager.add_image( lesson.user, lesson.image )

            print("Image:", storage_object.path)
            print("Image size:", storage_object.size, "bytes")
            return True

    print("ALL THUMBNAIL ATTEMPTS FAILED")
    return False

def generate_waveform(audio_path, samples=2000):

    audio = AudioSegment.from_file(audio_path)

    raw = np.array(
        audio.get_array_of_samples()
    )

    if audio.channels == 2:
        raw = raw.reshape((-1, 2))
        raw = raw.mean(axis=1)

    chunk_size = max(
        1,
        len(raw) // samples
    )

    waveform = []

    for i in range(samples):
        start = i * chunk_size
        end = start + chunk_size

        chunk = raw[start:end]

        if len(chunk):
            amp = np.max(np.abs(chunk))
            waveform.append(float(amp))

    max_amp = max(waveform)

    waveform = [
        x / max_amp
        for x in waveform
    ]

    return waveform


def create_channel_snapshot(channel_url, channel_id):
    image_uuid = uuid.uuid4().hex

    folder_name = f"{channel_id}_{image_uuid}"
    filename = f"{folder_name}.jpg"

    # Path stored in the database / returned by the API
    relative_path = os.path.join(
        "channels",
        folder_name,
        filename
    ).replace("\\", "/")

    # Actual path on the filesystem
    full_path = os.path.join(
        settings.MEDIA_ROOT,
        relative_path
    )

    os.makedirs(os.path.dirname(full_path), exist_ok=True)

    command = [
        "ffmpeg",
        "-y",
        "-i", channel_url,
        "-frames:v", "1",
        "-q:v", "2",
        full_path,
    ]

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode != 0:
            print("FFmpeg error:")
            print(result.stderr)
            return None

        print("Snapshot created:", full_path)
        print("Relative path:", relative_path)

        return relative_path

    except subprocess.TimeoutExpired:
        print("FFmpeg snapshot timed out.")
        return None

    except Exception as e:
        print("Snapshot error:", e)
        return None



@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def import_lesson(request):

    lesson = None
    save_lesson_media = None

    try:

        with transaction.atomic():

            print("=== RAW DATA ===")
            print(request.data)

            url = request.data.get('url')
            title = request.data.get('title')

            nativeLangName = request.data.get('nativeLanguage')
            targetLangName = request.data.get('targetLanguage')

            videoFormat = request.data.get('videoFormat', 'false' ).lower() in ['true', '1', 'yes']
            print("videoFormat: ",request.data.get("videoFormat"))



            audioUploaded = request.data.get('audioUploaded', 'false' ).lower() in ['true', '1', 'yes']
            lessonPrivate = request.data.get( 'lessonPrivate', 'false' ).lower() in ['true', '1', 'yes']

            fileUploaded = request.data.get( 'fileUploaded', 'false' ).lower() in ['true', '1', 'yes']

            urlReference = request.data.get( 'urlReference', 'false' ).lower() in ['true', '1', 'yes']
            imageReference = request.data.get( 'imageReference', 'false' ).lower() in ['true', '1', 'yes']
            translateTarget = request.data.get( 'translateTarget', 'false' ).lower() in ['true', '1', 'yes']

            lesson_file = request.FILES.get('file')
            media_file = request.FILES.get('media')
            image_file = request.FILES.get('image')

            generateAudio = request.data.get('generateAudio');
            fileType = request.data.get('fileType');

            print(lesson_file)

            nativeLang = get_object_or_404( Language, lang_name=nativeLangName )
            targetLang = get_object_or_404( Language, lang_name=targetLangName )

            user_id = request.user.id
            lesson_import_progress[user_id] = 0

            lessonEmpty = request.data.get('lessonEmpty')
            alwaysGenerateCaptions = request.data.get('alwaysGenerateCaptions')

            progress_process_workload = 0
            if generateAudio:
                progress_process_workload += 1
            if alwaysGenerateCaptions:
                progress_process_workload += 1
            if translateTarget:
                progress_process_workload +=1

            # CREATE LESSON
            lesson = Lesson.objects.create(
                user=request.user,
                url=url,
                native_language=nativeLang,
                target_language=targetLang,
                lesson_private=lessonPrivate,
                urlReference=urlReference,
                title=title,
                fileUploaded=fileUploaded,
                audioUploaded=audioUploaded,
                videoFormat=videoFormat
            )

            # SAVE IMAGE
            if image_file:
                lesson.image = image_file
                lesson.save()

                storage_object = StorageManager.add_image( request.user, lesson.image )

                print("Image:", storage_object.path)
                print("Image size:", storage_object.size, "bytes")

            # YOUTUBE IMAGE
            elif "youtube" in (url or "").lower():

                success = download_youtube_image(url, lesson)

                if not success:
                    raise Exception( "Failed to download YouTube thumbnail" )
            lesson_progress, created = UserLessonsProgress.objects.get_or_create(
                user=request.user,
                lesson=lesson,
                defaults={ 'current_lesson_index': 0, 'last_viewed': timezone.now() }
            )

            UserLanguageLessonIndex.objects.update_or_create(
                user=request.user,
                lesson_language=targetLang,
                defaults={ 'lesson_progress': lesson_progress }
            )

            lesson_import_progress[user_id] = 5

            # URL IMPORT
            if urlReference:

                save_lesson_media = URL_VTT(
                    lesson.url,
                    lesson.id,
                    lesson.target_language.id,
                    lesson.native_language.id,
                    lesson.uuid,
                    lesson_import_progress,
                    progress_process_workload,
                    user_id,
                    alwaysGenerateCaptions,
                    videoFormat,
                    translateTarget
                )

                success = save_lesson_media.process_lesson()
                if not success:
                    raise Exception( "YouTube processing failed" )
                lesson.media_folder = save_lesson_media.AUDIO_DIR
                lesson.save(update_fields=["media_folder"])

                lesson.refresh_from_db()

            if fileUploaded:
                if fileType == 'pdf':
                    print("pdf uploaded")
                    print(fileUploaded)
                    print("targetLang", targetLang)
                    print("nativeLang", nativeLang)
                    print("translateTarget", translateTarget)
                    print("lesson.target_language:", lesson.target_language)
                    print("lesson.native_language:", lesson.native_language)
                    ocr = OCR(
                        None,
                        targetLang.tesseract_langcode,
                        nativeLang.tesseract_langcode,
                        targetLang.yt_dlp_lang
                    )

                    ocr.process_pdf( lesson_file, lesson, lesson.target_language, lesson.native_language, translateTarget, user_id, lesson_import_progress, progress_process_workload)
                elif fileType == 'csv':
                    print("csv uploaded")

            # FILE IMPORT
            if (fileUploaded or alwaysGenerateCaptions) and (audioUploaded or videoFormat) and urlReference == False:

                print("has audio ")


                lesson.save()
                save_lesson_media = VTT(
                    lesson_file, lesson.id,
                    lesson.target_language.id,
                    lesson.native_language.id,
                    lesson.uuid,
                    lesson_import_progress,
                    progress_process_workload,
                    user_id,
                    alwaysGenerateCaptions,
                    videoFormat,
                    media_file,
                    translateTarget
                )


                success = save_lesson_media.process_lesson()
                if not success:
                    raise Exception(
                        "YouTube processing failed"
                    )

                #lesson.media_folder = save_lesson_media.AUDIO_DIR
                lesson.refresh_from_db()

                
            else:
                print("(fileUploaded or alwaysGenerateCaptions) and (audioUploaded or videoFormat) and urlReference is false")

            lesson_import_progress[user_id] = 100

            return Response({ 'message': 'Lesson uploaded successfully.', 'lessonId': lesson.id })

    except Exception as e:

        print("IMPORT ERROR:", str(e))

        lesson_import_progress[user_id] = -1

        # DELETE GENERATED FOLDERS
        try:

            if save_lesson_media:

                if hasattr(save_lesson_media, 'AUDIO_DIR'):

                    if os.path.exists(
                        save_lesson_media.AUDIO_DIR
                    ):
                        shutil.rmtree(
                            save_lesson_media.AUDIO_DIR,
                            ignore_errors=True
                        )

                if hasattr(save_lesson_media, 'OUTPUT_DIR'):

                    if os.path.exists(
                        save_lesson_media.OUTPUT_DIR
                    ):
                        shutil.rmtree(
                            save_lesson_media.OUTPUT_DIR,
                            ignore_errors=True
                        )

        except Exception as cleanup_error:

            print(
                "Cleanup error:",
                str(cleanup_error)
            )

        # DELETE DATABASE ENTRY
        try:

            if lesson:
                lesson.delete()

        except Exception as delete_error:

            print(
                "Lesson delete error:",
                str(delete_error)
            )

        return Response({
            "error": str(e)
        }, status=500)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lesson_import_progress_view(request):
    user_id = request.user.id
    progress = lesson_import_progress.get(user_id, 0)
    return Response({'progress': round(progress)})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_lessons(request):
    user = request.user
    settings = UserSetting.objects.get(user=user)
    print(f"This lessons target language is : {settings.target_language.id}")
    target_lang_id = settings.target_language.id
    lessons = Lesson.objects.filter( Q(user=user) | Q(lesson_private=False), target_language_id=target_lang_id )
    serializer = LessonSerializer(lessons, many=True, context={'request': request})
    print(serializer.data)
    return Response(serializer.data)

def str_to_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() == 'true'
    return False

@csrf_exempt
@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def edit_lesson(request, lesson_id, sentence_id=None):

    try:
        print("EDIT SENTENCE lesson_id:", lesson_id)
        print("EDIT SENTENCE user:", request.user)
        print("EDIT SENTENCE user_id:", request.user.id)
        
        print("LESSON WITH ID:", Lesson.objects.filter(id=lesson_id).values(
            'id', 'user_id', 'uuid'
        ))
        lesson = Lesson.objects.get( id=lesson_id, user=request.user )
    except Lesson.DoesNotExist:
        return Response(
            {'error': 'Lesson not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # ============================================================
    # SINGLE SENTENCE UPDATE / DELETE
    # ============================================================

    if sentence_id is not None:

        try:
            sentence_obj = Sentence.objects.get( id=sentence_id, lesson=lesson )
        except Sentence.DoesNotExist:
            return Response( {'error': 'Sentence not found'}, status=status.HTTP_404_NOT_FOUND )

        if request.method == 'PUT':

            sentence_obj.sentence = request.data.get( 'sentence', sentence_obj.sentence )

            sentence_obj.start_ms = request.data.get( 'start_ms', sentence_obj.start_ms )

            sentence_obj.end_ms = request.data.get( 'end_ms', sentence_obj.end_ms )

            sentence_obj.translated_sentence = request.data.get( 'translated_sentence', sentence_obj.translated_sentence )

            sentence_obj.save()

            return Response({
                'message': 'Sentence updated successfully',
                'sentence': {
                    'id': sentence_obj.id,
                    'sentence': sentence_obj.sentence,
                    'start_ms': sentence_obj.start_ms,
                    'end_ms': sentence_obj.end_ms,
                    'translated_sentence': sentence_obj.translated_sentence
                }
            })

        elif request.method == 'DELETE':

            sentence_obj.delete()

            return Response({ 'message': 'Sentence deleted successfully' })
        else:
            return Response( {'error': 'Method not allowed'}, status=status.HTTP_405_METHOD_NOT_ALLOWED )

    if request.method == 'GET':

        sentences = Sentence.objects.filter(lesson=lesson).order_by('position')

        if lesson.image:
            with lesson.image.open('rb') as f:
                image_data = base64.b64encode(f.read()).decode('utf-8')

        data = {
            'id': lesson.id,
            'title': lesson.title,
            'url': lesson.url,
            'lesson_private': lesson.lesson_private,
            'native_language': lesson.native_language.id,
            'target_language': lesson.target_language.id,
            'created_at' : lesson.created_at,
            'image_data': image_data,
            'image_name': os.path.basename(lesson.image.name) if lesson.image else None,
            'audio_name': os.path.basename(lesson.media_file.name) if lesson.media_file else None,
            'video_format': lesson.videoFormat,
            'audio_uploaded': lesson.audioUploaded,
            'sentencesReordered': lesson.sentencesReordered,
            'sentences': [
                {
                    'id': s.id,
                    'sentence': s.sentence,
                    'start_ms': s.start_ms,
                    'end_ms': s.end_ms,
                    'translated_sentence': s.translated_sentence,
                    'position': s.position,
                }
                for s in sentences
            ],
            'reading_level': lesson.reading_level_id,
            'reading_level_name': ( lesson.reading_level.name if lesson.reading_level else None ),
            'reading_level_scale_id': ( lesson.reading_level.scale_id if lesson.reading_level else None ),
        }

        return Response(data)

    elif request.method == 'PUT':

        print("FILES:", request.FILES)
        print("DATA:", request.data)
        print("Sentences Reordered", request.data.get('sentencesReordered'))

        lesson.title = request.data.get( 'title', lesson.title )
        lesson.url = request.data.get( 'url', lesson.url )
        lesson.lesson_private = str_to_bool(request.data.get('lesson_private'))
        lesson.sentencesReordered = str_to_bool(request.data.get('sentencesReordered'))
        reading_level_id = request.data.get('reading_level')

        if reading_level_id is not None:
            if reading_level_id == '':
                lesson.reading_level = None
            else:
                try:
                    lesson.reading_level = ReadingLevel.objects.get( id=reading_level_id )
                except ReadingLevel.DoesNotExist:
                    return Response( {'error': 'Reading level not found'}, status=status.HTTP_400_BAD_REQUEST )

        if 'image' in request.FILES:
            lesson.image = request.FILES['image']

        if 'media_file' in request.FILES:
            lesson.media_file = request.FILES['media_file']



        incoming_sentences = request.data.get( 'sentences', [] )

        if isinstance(incoming_sentences, str):
            incoming_sentences = json.loads(incoming_sentences)

        for position, s in enumerate(incoming_sentences):

            try:
                sentence_obj = Sentence.objects.get( id=s['id'], lesson=lesson )
                sentence_obj.sentence = s.get( 'sentence', sentence_obj.sentence )
                sentence_obj.start_ms = s.get( 'start_ms', sentence_obj.start_ms )
                sentence_obj.end_ms = s.get( 'end_ms', sentence_obj.end_ms )
                sentence_obj.translated_sentence = s.get( 'translated_sentence', sentence_obj.translated_sentence )
                sentence_obj.position = position

                sentence_obj.save()

            except Sentence.DoesNotExist:
                Sentence.objects.create(
                    lesson=lesson,
                    sentence=s.get('sentence', ''),
                    start_ms=s.get('start_ms', 0),
                    end_ms=s.get('end_ms', 0),
                    translated_sentence=s.get('translated_sentence', ''),
                    position=position,
                    lesson_language_id=lesson.target_language_id,
                    translate_language_id=lesson.native_language_id,
                )

        lesson.save()
        print("Native Language:", lesson.native_language)
        print("Target Language:", lesson.target_language )

        return Response({
            'message': 'Lesson updated successfully'
        })
    
    elif request.method == 'DELETE':

        try:
            with transaction.atomic():

                # Save paths before deleting the database object
                image_name = ( lesson.image.name if lesson.image else None )

                lesson_folder = os.path.join( settings.MEDIA_ROOT, 'lessons', str(lesson.uuid) )
                # Remove lesson media storage records
                StorageManager.delete_lesson_storage( request.user, lesson )
                # Delete image
                if ( image_name and image_name != 'images/default-01.jpg' ):
                    StorageManager.delete_image_storage( request.user, lesson.image )
                    lesson.image.delete(save=False)

                # Delete lesson folder
                if os.path.isdir(lesson_folder):
                    shutil.rmtree(lesson_folder)

                # Delete database record
                lesson.delete()

                # Recalculate aggregate sentence storage
                StorageManager.recalculate_sentence_storage( request.user )

                # Recalculate profile.used_storage from StorageObjects
                StorageManager.recalculate( request.user )
            return Response( {'message': 'Lesson deleted successfully'}, status=status.HTTP_200_OK )

        except Exception as e:
            print("Error deleting lesson:", e)

            return Response(
                {
                    'error': 'Failed to delete lesson',
                    'details': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_word(request):
    user = request.user
    print(f"User: {user.id}")
    required_fields = ['word', 'nat_id', 'tar_id', 'definition']
    if not all(field in request.data for field in required_fields):
        return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)

    word_text = request.data['word'].strip()

    nat_id = request.data.get('nat_id', {}).get('id')
    tar_id = request.data.get('tar_id', {}).get('id')
    user_id = user.id
    definition = request.data['definition'].strip()

    try:
        user = User.objects.get(id=user_id)
        nat_lang = Language.objects.get(id=nat_id)
        tar_lang = Language.objects.get(id=tar_id)
    except (User.DoesNotExist, Language.DoesNotExist):
        return Response({'error': 'User or language not found'}, status=status.HTTP_404_NOT_FOUND)

    word, created = Word.objects.get_or_create(word=word_text, language=tar_lang)

    user_word, created_user_word = UserWord.objects.get_or_create( user=user, word=word, defaults={ "frequency": BASE_NEW_WORD_FREQUENCY } )

    # 🔍 Check for existing translation
    existing = WordTranslation.objects.filter(
        native_language=nat_lang,
        target_language=tar_lang,
        user=user,
        word=word,
        definition=definition
    ).first()

    if existing:
        return Response({
            'message': 'This translation already exists.',
            'word_id': word.id,
            'translation_id': existing.id
        }, status=status.HTTP_200_OK)

    word_translation = WordTranslation.objects.create(
        native_language=nat_lang,
        target_language=tar_lang,
        user=user,
        word=word,
        definition=definition
    )

    return Response({
        'message': 'Word and translation saved',
        'word_id': word.id,
        'translation_id': word_translation.id
    }, status=status.HTTP_201_CREATED)


class FrontendAppView(TemplateView):
    template_name = 'index.html'




@ensure_csrf_cookie
def get_csrf(request):
    return JsonResponse({'message': 'CSRF cookie set'})


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    @csrf_exempt
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @csrf_exempt
    def post(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)



@api_view(['GET'])
@permission_classes([AllowAny])
def get_languages(request):
    languages = Language.objects.all()
    serializer = LanguageSerializer(languages, many=True)
    return Response(serializer.data)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_settings(request):
    user = request.user

    try:
        settings = UserSetting.objects.get(user=user)
    except UserSetting.DoesNotExist:
        return Response(
            {'error': 'Settings not found'},
            status=404
        )

    if request.method == 'GET':

        public_dictionaries = Dictionary.objects.filter(
            is_public=True
        ).filter(
            Q(
                native_language=settings.native_language,
                target_language=settings.target_language
            )
            |
            Q(
                native_language__isnull=True,
                target_language__isnull=True
            )
        ).values(
            'id',
            'name',
            'target_language',
            'native_language',
            'url',
            'user',
            'path',
            'dic_type',
            'is_public',
        )

        data = {
            'native_language': settings.native_language.lang_name,
            'target_language': settings.target_language.lang_name,
            'offline_mode': settings.offline_mode,
            'notifications': settings.notifications,

            'public_dictionaries': list(public_dictionaries),

            'user_dictionary': (
                settings.user_dictionary.id
                if settings.user_dictionary
                else None
            ),

            'user_set_volume': settings.user_set_volume,
            'user_set_speed': settings.user_set_speed,
            'repeat_audio': settings.repeat_audio,
            'repeat_audio_all': settings.repeat_audio_all,
            'shuffle_audio': settings.shuffle_audio,
            'showVideoCaptions': settings.showVideoCaptions,
            'showVideoView': settings.showVideoView,
            'continuousPlay': settings.continuousPlay,
            'isScraperEnabled': settings.isScraperEnabled,

            'speech_to_text_model': (
                settings.speechToTextModel.id
                if settings.speechToTextModel
                else None
            ),

            'text_to_text_model': (
                settings.textToTextModel.id
                if settings.textToTextModel
                else None
            ),

            'text_to_speech_model': (
                settings.textToSpeechModel.id
                if settings.textToSpeechModel
                else None
            ),

            'image_to_text_model': (
                settings.imageToTextModel.id
                if settings.imageToTextModel
                else None
            ),
        }

        return Response(data)
    elif request.method == 'PUT':
        
        native_id = request.data.get('native_language')
        target_id = request.data.get('target_language')
        speech_to_text_model_id = request.data.get('speech_to_text_model')
        text_to_text_model_id = request.data.get('text_to_text_model')
        text_to_speech_model_id = request.data.get('text_to_speech_model')
        image_to_text_model_id = request.data.get('image_to_text_model')
        offline_mode = request.data.get('offline_mode')
        notifications = request.data.get('notifications')
        user_dictionary_id = request.data.get('user_dictionary')
        user_set_volume = request.data.get('user_set_volume')
        user_set_speed = request.data.get('user_set_speed')
        repeat_audio = request.data.get('repeat_audio')
        repeat_audio_all = request.data.get('repeat_audio_all')
        shuffle_audio = request.data.get('shuffle_audio')
        showVideoCaptions = request.data.get('showVideoCaptions')
        showVideoView = request.data.get('showVideoView')
        continuousPlay = request.data.get('continuousPlay')
        isScraperEnabled = request.data.get('isScraperEnabled')

        print('offline mode', offline_mode)

        if native_id is None or target_id is None:
            return Response(
                {'error': 'Both native_language and target_language are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            print(f"Incoming PUT data: {request.data}")  # Debug log

            native_lang = get_object_or_404(Language, lang_name=native_id)
            target_lang = get_object_or_404(Language, lang_name=target_id)
            settings, _ = UserSetting.objects.get_or_create(user=user)

            user_dictionary = None
            if user_dictionary_id:
                user_dictionary = get_object_or_404( Dictionary, id=user_dictionary_id )

            if speech_to_text_model_id:
                settings.speechToTextModel = get_object_or_404(
                    AIModel,
                    id=speech_to_text_model_id,
                    purpose='speech_to_text',
                    is_active=True
                )

            if text_to_text_model_id:
                settings.textToTextModel = get_object_or_404(
                    AIModel,
                    id=text_to_text_model_id,
                    purpose='text_to_text',
                    is_active=True
                )

            if text_to_speech_model_id:
                settings.textToSpeechModel = get_object_or_404(
                    AIModel,
                    id=text_to_speech_model_id,
                    purpose='text_to_speech',
                    is_active=True
                )

            if image_to_text_model_id:
                settings.imageToTextModel = get_object_or_404(
                    AIModel,
                    id=image_to_text_model_id,
                    purpose='image_to_text',
                    is_active=True
                )


            settings.native_language = native_lang
            settings.target_language = target_lang
            language_index = (
                UserLanguageLessonIndex.objects
                .select_related(
                    'lesson_progress',
                    'lesson_progress__lesson'
                )
                .filter(
                    user=user,
                    lesson_language=target_lang
                )
                .first()
            )
            if language_index and language_index.lesson_progress:
                profile = Profile.objects.get(user=user)
                profile.current_lesson = language_index.lesson_progress
                profile.save()

            settings.offline_mode = bool(offline_mode)
            settings.notifications = bool(notifications)
            if user_dictionary_id is not None:
                settings.user_dictionary = user_dictionary
            settings.user_set_volume = float(user_set_volume) if user_set_volume is not None else settings.user_set_volume
            settings.user_set_speed = float(user_set_speed) if user_set_speed is not None else settings.user_set_speed
            settings.repeat_audio = repeat_audio if repeat_audio is not None else settings.repeat_audio
            settings.repeat_audio_all = repeat_audio_all if repeat_audio_all is not None else settings.repeat_audio_all
            settings.shuffle_audio = shuffle_audio if shuffle_audio is not None else settings.shuffle_audio
            settings.showVideoCaptions = showVideoCaptions if showVideoCaptions is not None else settings.showVideoCaptions
            settings.showVideoView = showVideoView if showVideoView is not None else settings.showVideoView
            settings.continuousPlay = continuousPlay if continuousPlay is not None else settings.continuousPlay
            settings.isScraperEnabled = isScraperEnabled if isScraperEnabled is not None else settings.isScraperEnabled
            settings.save()

            return Response({'message': 'Settings updated successfully'})
        except Language.DoesNotExist:
            return Response({'error': 'Invalid language ID'}, status=status.HTTP_400_BAD_REQUEST)
        except AIModel.DoesNotExist:

            return Response( { 'error': 'Invalid AI model.' }, status=status.HTTP_400_BAD_REQUEST )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def account(request):
    user = request.user

    if request.method == 'GET':
        profile, created = Profile.objects.get_or_create(user=user)

        data = {
            'username': user.username,
            'email': user.email,
            'storage_used': profile.used_storage // (1024 * 1024),
            'storage_total': profile.total_storage // (1024 * 1024),
        }

        return Response(data, status=status.HTTP_200_OK)

    elif request.method == 'PUT':
        data = request.data

        username = data.get('username')
        email = data.get('email')
        password = data.get('password')

        if username:
            user.username = username

        if email:
            user.email = email

        if password:
            user.password = make_password(password)

        user.save()

        return Response(
            {'message': 'Account updated successfully.'},
            status=status.HTTP_200_OK
        )

@api_view(['POST', 'GET'])
@authentication_classes([JWTAuthentication])  # Don't leave this empty
@permission_classes([IsAuthenticated])
def user_lessons_progress_view(request):
    user = request.user

    if request.method == 'POST':
        lesson_id = request.data.get('lesson_id')
        current_index = request.data.get('current_lesson_index')

        print(f"Lesson_id {lesson_id}")

        if not lesson_id or current_index is None:
            return Response({"error": "lesson_id and current_lesson_index are required"}, status=400)

        try:
            lesson = Lesson.objects.get(id=lesson_id)
        except Lesson.DoesNotExist:
            return Response({"error": "Lesson not found"}, status=404)



        
        # Create or update the progress
        progress, created = UserLessonsProgress.objects.get_or_create(
            user=user,
            lesson_id=lesson.id,
            defaults={
                "current_lesson_index": current_index,
                "last_viewed": timezone.now(),
            }
        )

        if not created:
            progress.current_lesson_index = current_index
            progress.last_viewed = timezone.now()
            progress.save(
                update_fields=['current_lesson_index', 'last_viewed']
            )

        # Handle lesson completion or reset
        if 'is_completed' in request.data:
            completion_requested = request.data.get('is_completed')

            if completion_requested is True and not progress.is_completed:
                progress.is_completed = True
                progress.num_of_times_read += 1

            elif completion_requested is False:
                progress.is_completed = False
                progress.current_lesson_index = 0

            progress.save(
                update_fields=[
                    'is_completed',
                    'current_lesson_index',
                    'num_of_times_read',
                ]
            )

        UserLanguageLessonIndex.objects.update_or_create(
            user=user,
            lesson_language=lesson.target_language,
            defaults={
                'lesson_progress': progress
            }
        )



        # Update the user's profile current_lesson FK
        try:
            profile = Profile.objects.get(user=user)
            profile.current_lesson = progress
            profile.save()
        except Profile.DoesNotExist:
            # Optional: handle missing profile case (e.g., create or ignore)
            pass

        native_lang_data = LanguageSerializer(lesson.native_language).data
        target_lang_data = LanguageSerializer(lesson.target_language).data

        data = {
            "lesson_id": progress.lesson.id if progress.lesson else None,
            "current_lesson_index": progress.current_lesson_index,
            "last_viewed": progress.last_viewed.isoformat() if progress.last_viewed else None,
            "native_lang": native_lang_data,
            "target_lang": target_lang_data,
            "is_completed": progress.is_completed,
            "num_of_times_read": progress.num_of_times_read,

        }

        return Response(data)

    elif request.method == 'GET':
        lesson_id = request.query_params.get('lesson_id')

        if lesson_id:
            try:
                lesson_id_int = int(lesson_id)
            except ValueError:
                return Response({"error": "lesson_id must be an integer"}, status=400)

            try:
                lesson = Lesson.objects.get(id=lesson_id)
            except Lesson.DoesNotExist:
                return Response({"error": "Lesson not found"}, status=404)

            try:
                print(f"Lesson id: {lesson_id_int}")
                progress = UserLessonsProgress.objects.get(user=user, lesson=lesson_id_int)
                print(f"Pogress: {progress.current_lesson_index}")
                native_language_data = LanguageSerializer(lesson.native_language).data
                target_language_data = LanguageSerializer(lesson.target_language).data
                native_language_id = native_language_data
                target_language_id = target_language_data
                data = {
                    "lesson_id": progress.lesson.id if progress.lesson else None,
                    "current_lesson_index": progress.current_lesson_index,
                    "last_viewed": progress.last_viewed.isoformat() if progress.last_viewed else None,
                    "native_lang": native_language_id,
                    "target_lang": target_language_id,
                    "is_completed": progress.is_completed,
                    "num_of_times_read": progress.num_of_times_read,
                }
                print(data)
                return Response(data)
            except UserLessonsProgress.DoesNotExist:
                return Response({"error": "Progress not found"}, status=404)

@api_view(['POST', 'GET'])
@authentication_classes([JWTAuthentication])  # Don't leave this empty
@permission_classes([IsAuthenticated])
def lesson_detail_with_sentences(request, lesson_id):
    try:
        lesson = Lesson.objects.get(id=lesson_id)
        sentences = Sentence.objects.filter(lesson_id=lesson)

        native_language_data = LanguageSerializer(lesson.native_language).data
        target_language_data = LanguageSerializer(lesson.target_language).data
        native_language_id = native_language_data
        target_language_id = target_language_data

        lesson_data = {
            "id": lesson.id,
            "title": lesson.title,
            "user_id": lesson.user.id,
            "doc_file": lesson.doc_file.url if lesson.doc_file else None,
            "audio_file": lesson.media_file.url if lesson.media_file else None,
            "native_language": native_language_id,
            "target_language": target_language_id,
            'audioUploaded': lesson.audioUploaded,
            "sentences": [
                {
                    "id": s.id,
                    "sentence": s.sentence,
                    "translated_sentence": s.translated_sentence,
                    "start_ms": s.start_ms,
                    "end_ms": s.end_ms,
                    "position": s.position,
                }
                for s in sentences
            ],
            'videoFormat' : lesson.videoFormat
        }

        print(lesson_data['sentences'])

        return Response(lesson_data, status=status.HTTP_200_OK)

    except Lesson.DoesNotExist:
        return Response({'error': 'Lesson not found'}, status=status.HTTP_404_NOT_FOUND)

@csrf_exempt
@api_view(['POST'])
def get_audio(request):

    lesson_id = request.data.get('lesson_id')
    current_lesson_index = int(request.data.get('current_lesson_index', 0))
    full_audio = request.data.get('full_audio')
    print(full_audio)



    if full_audio:
        try:
            lesson = Lesson.objects.get(id=lesson_id)

            if not lesson.media_folder and not getattr(lesson, 'media_file', None):
                return Response({'error': 'Lesson has no audio'}, status=404)

            # === PREFERRED: Use Django FileField if available ===
            if hasattr(lesson, 'media_file') and lesson.media_file:
                audio_path = lesson.media_file.path
                print("FULL AUDIO PATH (from FileField):", audio_path)

            # === FALLBACK: Build from media_folder ===
            else:
                audio_folder = lesson.media_folder

                print("Audio Folder:", audio_folder)

                # Clean and normalize the folder path
                if audio_folder:
                    # Remove trailing /audio if present
                    if audio_folder.endswith(('/audio', '\\audio')):
                        audio_folder = audio_folder[:-6]

                    # If it's a relative path, make it absolute
                    if not os.path.isabs(audio_folder):
                        audio_folder = os.path.join(settings.MEDIA_ROOT, audio_folder)

                audio_path = os.path.join(audio_folder, "audio.mp3")
                print("FULL AUDIO PATH (built):", audio_path)

            if not os.path.exists(audio_path):
                print(f"❌ Audio file not found at: {audio_path}")
                return Response(
                    {'error': 'Lesson audio file not found'},
                    status=404
                )

            response = FileResponse(
                open(audio_path, 'rb'),
                content_type='audio/mpeg'
            )
            response["Content-Length"] = os.path.getsize(audio_path)
            response["Accept-Ranges"] = "bytes"

            return response

        except Lesson.DoesNotExist:
            return Response({'error': 'Lesson not found'}, status=404)
        except Exception as e:
            print("Audio error:", str(e))
            return Response({'error': str(e)}, status=500)

    else:

        try:


            lesson = Lesson.objects.get(id=lesson_id)
            if not lesson.media_folder:
                return Response({'error': 'Audio folder not set for this lesson'}, status=404)

            # Construct absolute path
            audio_folder = os.path.join(settings.BASE_DIR, 'api', lesson.media_folder)
            print(f"Audio folder: {audio_folder}")

            if not os.path.exists(audio_folder):
                return Response({'error': 'Audio folder does not exist'}, status=404)

            # List all .wav files
            wav_files = sorted([f for f in os.listdir(audio_folder) if f.endswith('.wav')])
            print("WAV files:", wav_files)

            if not wav_files:
                return Response({'error': 'No audio files found'}, status=404)

            if current_lesson_index < 0 or current_lesson_index >= len(wav_files):
                return Response({'error': 'Invalid audio index'}, status=400)

            audio_path = os.path.join(audio_folder, wav_files[current_lesson_index])
            if not os.path.isfile(audio_path):
                return Response({'error': 'Audio file not found'}, status=404)

            return FileResponse(open(audio_path, 'rb'), content_type='audio/wav')

        except Lesson.DoesNotExist:
            return Response({'error': 'Lesson not found'}, status=404)
        except ValueError:
            return Response({'error': 'Invalid index format'}, status=400)
        except Exception as e:
            print("Audio error:", str(e))
            return Response({'error': 'Server error while fetching audio'}, status=500)

@csrf_exempt
@api_view(['POST'])
def change_lesson(request):
    if request.method == 'POST':
        user = request.user
        lesson_id = request.data.get('lesson_id')

        if not lesson_id:
            return Response({'error': 'lesson_id is required'}, status=400)

        try:
            lesson = Lesson.objects.get(id=lesson_id)
        except Lesson.DoesNotExist:
            return Response({'error': 'Invalid lesson_id'}, status=400)


        lesson_progress, created = UserLessonsProgress.objects.get_or_create(
            user=user,
            lesson=lesson,
            defaults={'current_lesson_index': 0}
        )

        UserLanguageLessonIndex.objects.update_or_create(
            user=user,
            lesson_language=lesson.target_language,
            defaults={
                'lesson_progress': lesson_progress
            }
        )

        # Update profile
        profile = user.profile
        profile.current_lesson = lesson_progress
        profile.save()

        return Response({
            'message': 'Current lesson updated successfully',
            'created': created,
            'lesson_progress_id': lesson_progress.id
        })

@api_view(['PUT'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def update_word_translation(request):
    translation_id = request.data.get('translation_id')
    definition = request.data.get('definition')

    if not translation_id:
        return Response(
            {'error': 'translation_id is required'},
            status=400
        )

    try:
        translation = WordTranslation.objects.get(
            id=translation_id,
            user=request.user
        )
    except WordTranslation.DoesNotExist:
        return Response(
            {'error': 'Translation not found'},
            status=404
        )

    translation.definition = definition
    translation.save()

    return Response({
        'message': 'Definition updated successfully',
        'translation_id': translation.id,
        'definition': translation.definition
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_waveform(request):

    lesson_id = request.data.get(
        'lesson_id'
    )

    lesson = Lesson.objects.get(
        id=lesson_id
    )

    audio_path = os.path.join(
        os.path.dirname(
            lesson.media_folder
        ),
        "audio.mp3"
    )

    waveform = generate_waveform(
        audio_path
    )

    return Response({
        "waveform": waveform
    })

@api_view(["POST"])
def start_record(request):

    print("Current directory:", os.getcwd())
    print("Records exists:", os.path.exists("records"))

    record_dir = os.path.join(settings.MEDIA_ROOT, "records")
    os.makedirs(record_dir, exist_ok=True)

    print(record_dir)

    url = request.data["url"]
    channel_id = request.data["channel_id"]

    recording_id = str(uuid.uuid4().hex[:16])

    output_file = os.path.join(
            record_dir,
            f"{recording_id}.mp4"
        )

    print("OUTPUT FILE:", output_file)

    ffmpeg_cmd = [
        "ffmpeg",
        "-i", url,

        "-protocol_whitelist", "file,http,https,tcp,tls,crypto",
        "-analyzeduration", "10M",
        "-probesize", "10M",

        "-t", "999999",

        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "23",

        "-c:a", "aac",

        "-movflags", "+faststart",

        output_file
    ]

    process = subprocess.Popen(
        ffmpeg_cmd,
        stdin=subprocess.PIPE
    )

    RECORDINGS[recording_id] = process

    return Response({
        "recording_id": recording_id
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def stop_record(request):
    recording_id = request.data["recording_id"]
    language_name = request.data["language_id"]

    print("Langauge_id:", language_name)

    process = RECORDINGS.get(recording_id)

    if process:
        try:
            process.stdin.write(b"q")
            process.stdin.flush()
            process.wait(timeout=15)
        except Exception:
            process.terminate()

        del RECORDINGS[recording_id]

    # Path relative to MEDIA_ROOT
    relative_path = f"records/{recording_id}.mp4"

    thumbnail_dir = os.path.join(settings.MEDIA_ROOT, "images/record_thumbnails")
    os.makedirs(thumbnail_dir, exist_ok=True)

    thumbnail_path = os.path.join(
        thumbnail_dir,
        f"{recording_id}.jpg"
    )

    subprocess.run([
        "ffmpeg",
        "-y",
        "-i", os.path.join(settings.MEDIA_ROOT, relative_path),
        "-vf", "thumbnail,scale=320:-1",
        "-frames:v", "1",
        thumbnail_path,
    ], check=True)

    video_path = os.path.join(settings.MEDIA_ROOT, relative_path)

    # Add recording video to user's storage
    StorageManager.add_file( request.user, video_path )

    # Add recording thumbnail to user's storage
    StorageManager.add_file( request.user, thumbnail_path )

    result = subprocess.run(
        [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            video_path,
        ],
        capture_output=True,
        text=True,
    )

    duration = float(result.stdout.strip()) if result.stdout.strip() else 0

    recording = Recording.objects.create(
        user=request.user,
        record_name=recording_id,
        record_file=relative_path,
        record_img=f"/media/images/record_thumbnails/{recording_id}.jpg",
        record_folder="records",
        record_channel=Channel.objects.get(pk=request.data["channel_id"]),
        native_language = Language.objects.get(lang_name=language_name),
        is_public=False,
        duration=duration,
    )

    file_url = request.build_absolute_uri(recording.record_file.url)

    return Response({
        "id": recording.id,
        "file_url": file_url,
    })


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def recordings(request, recording_id=None):

    # ============================================================
    # GET
    # ============================================================
    if request.method == "GET":

        # --------------------------------------------------------
        # GET ONE RECORDING
        # /api/recordings/<id>/
        # --------------------------------------------------------
        if recording_id is not None:

            try:
                 recording = Recording.objects.get(
                    Q(user=request.user) | Q(is_public=True),
                    id=recording_id
                )
            except Recording.DoesNotExist:
                return Response(
                    {"error": "Recording not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            return Response({
                "id": recording.id,
                "user_id": recording.user.id,
                "title": (
                    getattr(recording, "record_name", None)
                    or f"Recording {recording.id}"
                ),
                "record_file": (
                    recording.record_file.url
                    if getattr(recording, "record_file", None)
                    else None
                ),
                "record_img": getattr(
                    recording,
                    "record_img",
                    None
                ),
                "created_at": (
                    recording.created_at.isoformat()
                    if hasattr(recording, "created_at")
                    else None
                ),
                "is_public": recording.is_public,
                "duration": recording.duration,
            })

        # --------------------------------------------------------
        # GET ALL RECORDINGS
        # /api/recordings/
        # --------------------------------------------------------

        try:
            user_settings = UserSetting.objects.get(
                user=request.user
            )
        except UserSetting.DoesNotExist:
            return Response(
                {"error": "User settings not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        recording_queryset = (
            Recording.objects
            .filter(
                Q(user=request.user) | Q(is_public=True),
                native_language=user_settings.target_language
            )
            .order_by("-created_at")
        )

        data = []

        for recording in recording_queryset:

            data.append({
                "id": recording.id,
                "user_id": recording.user.id,
                "title": (
                    getattr(recording, "record_name", None)
                    or f"Recording {recording.id}"
                ),
                "record_file": (
                    recording.record_file.url
                    if getattr(recording, "record_file", None)
                    else None
                ),
                "record_img": getattr(
                    recording,
                    "record_img",
                    None
                ),
                "created_at": (
                    recording.created_at.isoformat()
                    if hasattr(recording, "created_at")
                    else None
                ),
                "is_public": recording.is_public,
                "duration": recording.duration,
            })

        return Response(data)

    # ============================================================
    # PATCH
    # ============================================================
    if request.method == "PATCH":

        if recording_id is None:
            return Response(
                {"error": "Recording ID is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        is_public = request.data.get("is_public")

        if is_public is None:
            return Response(
                {"error": "is_public is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            recording = Recording.objects.get(
                id=recording_id,
                user=request.user
            )
        except Recording.DoesNotExist:
            return Response(
                {"error": "Recording not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        recording.is_public = bool(is_public)

        recording.save(
            update_fields=["is_public"]
        )

        return Response({
            "id": recording.id,
            "is_public": recording.is_public,
        })

    # ============================================================
    # DELETE
    # ============================================================
    if request.method == "DELETE":

        if recording_id is None:
            return Response(
                {"error": "Recording ID is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            recording = Recording.objects.get(
                id=recording_id,
                user=request.user
            )
        except Recording.DoesNotExist:
            return Response(
                {"error": "Recording not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            with transaction.atomic():

                # ------------------------------------------------
                # VIDEO
                # ------------------------------------------------
                relative_path = (
                    f"records/{recording.record_name}.mp4"
                )

                video_path = os.path.join(
                    settings.MEDIA_ROOT,
                    relative_path
                )

                # ------------------------------------------------
                # THUMBNAIL
                # ------------------------------------------------
                thumbnail_path = os.path.join(
                    settings.MEDIA_ROOT,
                    "images",
                    "record_thumbnails",
                    f"{recording.record_name}.jpg"
                )

                print(
                    "VIDEO PATH:",
                    repr(video_path)
                )

                print(
                    "THUMBNAIL PATH:",
                    repr(thumbnail_path)
                )

                # ------------------------------------------------
                # STORAGE ACCOUNTING
                # ------------------------------------------------
                video_size = StorageManager.subtract_file(
                    request.user,
                    video_path
                )

                thumbnail_size = StorageManager.subtract_file(
                    request.user,
                    thumbnail_path
                )

                print(
                    "VIDEO STORAGE REMOVED:",
                    video_size
                )

                print(
                    "THUMBNAIL STORAGE REMOVED:",
                    thumbnail_size
                )

                # ------------------------------------------------
                # DELETE PHYSICAL FILES
                # ------------------------------------------------
                if os.path.exists(video_path):
                    os.remove(video_path)

                if os.path.exists(thumbnail_path):
                    os.remove(thumbnail_path)

                # ------------------------------------------------
                # DELETE DATABASE RECORD
                # ------------------------------------------------
                recording.delete()

                # ------------------------------------------------
                # RECALCULATE STORAGE
                # ------------------------------------------------
                StorageManager.recalculate(
                    request.user
                )

            return Response(
                {
                    "success": True,
                    "video_storage_removed": video_size,
                    "thumbnail_storage_removed": thumbnail_size,
                },
                status=status.HTTP_200_OK
            )

        except Exception as e:

            print(
                "Error deleting recording:",
                e
            )

            return Response(
                {
                    "error": "Failed to delete recording",
                    "details": str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def sentence_word_frequency(request):
    sentence_id = request.data.get("sentence_id")

    if not sentence_id:
        return Response(
            {"error": "sentence_id required"},
            status=400
        )

    try:
        sentence = Sentence.objects.select_related(
            "lesson_language",
            "translate_language"
        ).get(id=sentence_id)

    except Sentence.DoesNotExist:
        return Response(
            {"error": "Sentence not found"},
            status=404
        )

    # split sentence into words
    words = re.findall(
        r"\b[\w']+\b",
        sentence.sentence.lower()
    )

    print("Words: ", words)

    result = []

    for word_text in words:

        #print("WORD:", word_text)
        #print("LESSON LANGUAGE:", sentence.lesson_language)

        frequency = 0.0
        has_translation = False
        is_saved = False

        word_obj = Word.objects.filter(
            word__iexact=word_text,
            language=sentence.lesson_language
        ).first()

        #print("WORD OBJ:", word_obj)

        if word_obj:

            has_translation = WordTranslation.objects.filter(
                word=word_obj,
                native_language=sentence.translate_language,
                target_language=sentence.lesson_language
            ).exists()

            #print("HAS TRANSLATION:", has_translation)

            if has_translation:

                frequency = BASE_NEW_WORD_FREQUENCY

                user_word = UserWord.objects.filter(
                    user=request.user,
                    word=word_obj
                ).first()

                if user_word:
                    is_saved = True

                    # 1. Increase frequency (cap at 100)
                    new_frequency = min(
                        100.0,
                        float(user_word.frequency) + WORD_INCREASE_FREQUENCY
                    )

                    user_word.frequency = new_frequency
                    interval_days = int(2 ** (new_frequency / 20))

                    # 2. Update review date (spaced repetition logic)
                    # Higher frequency = longer interval
                    if new_frequency < 20:
                        interval_days = 1
                    elif new_frequency < 50:
                        interval_days = 3
                    elif new_frequency < 80:
                        interval_days = 7
                    else:
                        interval_days = 14

                    user_word.review_date = timezone.now().date() + timedelta(days=interval_days)
                    user_word.last_seen = timezone.now().date()

                    user_word.save()

                    # # for UI scoring (optional)
                    # frequency += new_frequency * WORD_INCREASE_FREQUENCY
                    frequency = new_frequency

                else:
                    # CREATE UserWord if it doesn't exist
                    user_word = UserWord.objects.create(
                        user=request.user,
                        word=word_obj,
                        frequency=BASE_NEW_WORD_FREQUENCY
                    )

                    is_saved = True  # now it exists, so mark as saved

        result.append({
            "word": word_text,
            "frequency": round(frequency, 2),
            "has_translation": has_translation,
            "is_saved": is_saved,
        })
    #print("Sentence Data:", result)

    return Response(result)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ocr_image(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=400)

    image_file = request.FILES.get("image")
    translateText = request.POST.get("translateText")
    generateAudio = request.POST.get("generateAudio")
    print("translateText value:", repr(translateText))
    print("translateText type:", type(translateText))
    print("Translating Text:", translateText)
    print("Generate Audio", generateAudio)

    if not image_file:
        return JsonResponse({"error": "No image supplied"}, status=400)

    # --- Get user from token ---
    auth = JWTAuthentication()
    try:
        user_auth = auth.authenticate(request)
        if user_auth is None:
            return JsonResponse({"error": "Unauthorized"}, status=401)

        user, token = user_auth
    except Exception:
        return JsonResponse({"error": "Invalid token"}, status=401)

    # --- Get user's target language ---
    try:
        settings = UserSetting.objects.get(user=user)

        lang_code = settings.target_language.tesseract_langcode
        native_lang_code = settings.native_language.tesseract_langcode
        paddle_lang_code = settings.target_language.yt_dlp_lang

        image_to_text_model = settings.imageToTextModel

        print("lang_code:", lang_code)
        print("native_lang_code:", native_lang_code)

        if image_to_text_model:
            print(
                "Image to Text Model:",
                image_to_text_model.model_type
            )
        else:
            print(
                "Image to Text Model: None"
            )

    except UserSetting.DoesNotExist:

        lang_code = "eng"
        native_lang_code = "eng"
        image_to_text_model = None

    # --- Run OCR ---
    model_type = ( image_to_text_model.model_type if image_to_text_model else "tesseract" )
    ocr = OCR( image_file, lang_code, native_lang_code, paddle_lang_code, model_type=model_type )
    text = ocr.image_to_text( ocr.image )

    sentences = ocr.text_to_sentences(text)

    print("OCR SENTENCES:", len(sentences))

    for sentence in sentences:
        print("OCR SENTENCE:", sentence)

    translated_text = ""

    if translateText:
        load_user_model(user)

        translated_sentences = []

        for sentence in sentences:
            translated_sentence = translate_word(
                sentence,
                src_lang=settings.target_language.yt_dlp_lang,
                tgt_lang=settings.native_language.yt_dlp_lang
            )

            translated_sentences.append(translated_sentence)

        translated_text = " ".join(translated_sentences)

    return JsonResponse({"text": text, "translation": translated_text})






@api_view(['GET'])
@permission_classes([IsAuthenticated])
def language_items(request, item_type):
    user_settings = UserSetting.objects.select_related(
        'target_language'
    ).get(user=request.user)

    lang_code = user_settings.target_language.yt_dlp_lang

    # Example:
    # alphabet -> api/alphabets/lt_alphabet/lt_alphabet.json
    # numbers  -> api/numbers/lt_numbers/lt_numbers.json

    if item_type == 'alphabet':
        folder_name = f'{lang_code}_alphabet'
        json_name = f'{lang_code}_alphabet.json'
        base_folder = 'alphabets'
        json_key = 'alphabet'

    elif item_type == 'numbers':
        folder_name = f'{lang_code}_numbers'
        json_name = f'{lang_code}_numbers.json'
        base_folder = 'numbers'
        json_key = 'numbers'

    else:
        return JsonResponse(
            {'error': 'Invalid item type'},
            status=400
        )

    item_dir = (
        Path(settings.BASE_DIR)
        / 'api'
        / base_folder
        / folder_name
    )

    json_file = item_dir / json_name

    print("BASE_DIR:", settings.BASE_DIR)
    print("item_dir:", item_dir)
    print("json_file:", json_file)
    print("exists:", json_file.exists())

    if not json_file.exists():
        return JsonResponse(
            {
                'error': f'{item_type.title()} not found for language {lang_code}'
            },
            status=404
        )

    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if isinstance(data, list):
        items = data
    else:
        items = data.get(json_key, [])

    for item in items:
        if 'audio' not in item:
            print("Missing audio field:", item)
            continue

        filename = Path(item['audio']).name

        if not filename.endswith('.mp3'):
            filename = f"{filename}.mp3"

        audio_url = request.build_absolute_uri(
            f"/api/{item_type}/audio/{lang_code}/{filename}"
        )

        print("Audio filename:", filename)
        print("Audio URL:", audio_url)

        item['audio'] = audio_url

    return JsonResponse(
        data,
        safe=False if isinstance(data, list) else True
    )


def language_item_audio(request, item_type, lang_code, filename):

    if item_type == 'alphabet':
        base_folder = 'alphabets'
        folder_name = f'{lang_code}_alphabet'

    elif item_type == 'numbers':
        base_folder = 'numbers'
        folder_name = f'{lang_code}_numbers'

    else:
        raise Http404("Invalid item type")

    audio_file = (
        Path(settings.BASE_DIR)
        / 'api'
        / base_folder
        / folder_name
        / filename
    )

    print(audio_file)

    if not audio_file.exists():
        raise Http404("Audio file not found")

    response = FileResponse(
        open(audio_file, 'rb'),
        content_type='audio/mpeg'
    )

    response["Access-Control-Allow-Origin"] = "*"
    response["Accept-Ranges"] = "bytes"

    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_practice_item(request):
    """GET /api/practice/?mode=word or ?mode=phrase"""
    mode = request.query_params.get('mode', 'phrase').lower()
    user = request.user

    try:
        user_setting = UserSetting.objects.filter(user=user).first()
        if not user_setting:
            return Response({"error": "User settings not found. Please set your languages."},
                          status=status.HTTP_400_BAD_REQUEST)

        target_lang = user_setting.target_language

        if mode == 'word':
            user_words = UserWord.objects.filter(
                user=user,
                word__language=target_lang
            ).select_related('word')

            if not user_words.exists():
                return Response({"error": "No words available for practice"},
                              status=status.HTTP_404_NOT_FOUND)

            user_word = random.choice(list(user_words))
            text = user_word.word.word

        elif mode == 'phrase':
            sentences = Sentence.objects.filter(
                lesson_language=target_lang
            )

            if not sentences.exists():
                return Response({"error": "No sentences available for practice"},
                              status=status.HTTP_404_NOT_FOUND)

            sentence = random.choice(list(sentences))
            text = sentence.sentence

        else:
            return Response({"error": "Invalid mode"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "text": text,
            "type": mode,
        })

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def evaluate_pronunciation_view(request):
    """POST /api/practice/evaluate/"""
    try:
        text = request.data.get('text')
        mode = request.data.get('mode', 'phrase')
        audio_file = request.FILES.get('audio')

        print("Text: ", text)
        print("Mode: ", mode)
        print("Audio file:", audio_file)
        print("FILES:", request.FILES)

        if not text or not audio_file:
            return Response({"error": "Text and audio file are required"},
                          status=status.HTTP_400_BAD_REQUEST)

        result = evaluate_pronunciation(audio_file, text, mode, request.user)

        return Response({
            "correct": result["correct"],
            "message": result["feedback"],
            "score": result["score"],
            "recognized": result.get("recognized", ""),
        })

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'POST', 'PATCH'])
@permission_classes([IsAuthenticated])
def channels(request, channel_id=None):

    user_settings = UserSetting.objects.get(user=request.user)

    print("User:", request.user)
    print("Settings:", user_settings)
    print("Native:", user_settings.target_language_id)

    # ADD CHANNEL
    if request.method == 'POST':

        channel_name = request.data.get('channel_name')
        channel_url = request.data.get('channel_url')
        channel_img = request.FILES.get('channel_img')
        channel_public = request.data.get('channel_public', False)

        if isinstance(channel_public, str):
            channel_public = channel_public.lower() == 'true'

        if not channel_name or not channel_url:
            return Response(
                {"error": "Channel name and URL are required."},
                status=400
            )

        channel = Channel.objects.create(
            user=request.user,
            channel_name=channel_name,
            channel_url=channel_url,
            native_language_id=user_settings.target_language_id,
            is_public=channel_public,
            is_favorite=False
        )

        # ---------------------------------
        # USER PROVIDED IMAGE
        # ---------------------------------

        if channel_img:

            image_uuid = uuid.uuid4().hex
            folder_name = f"{channel.id}_{image_uuid}"

            file_path = "/".join([
                "channels",
                folder_name,
                f"{folder_name}{os.path.splitext(channel_img.name)[1]}"
            ])

            saved_path = default_storage.save(
                file_path,
                channel_img
            )

            channel.channel_img = saved_path.replace("\\", "/")
            channel.save()



            print("Uploaded channel image:", saved_path)

        # ---------------------------------
        # NO IMAGE → STREAM SNAPSHOT
        # ---------------------------------

        else:
            snapshot_path = create_channel_snapshot( channel_url, channel.id )

            if snapshot_path:
                channel.channel_img = snapshot_path
                channel.save()
                print("Channel snapshot saved:", snapshot_path)

            else:
                print("Could not create channel snapshot.")

        return Response({
            "id": channel.id,
            "name": channel.channel_name,
            "url": channel.channel_url,
            "image": channel.channel_img,
            "owner": channel.user.username,
            "owner_id": channel.user.id,
            "is_public": channel.is_public,
            "is_favorite": channel.is_favorite,
            "target_language": user_settings.target_language_id,
            "native_language": user_settings.target_language_id
        }, status=201)

    # UPDATE CHANNEL PUBLIC/is_public
    if request.method == 'PATCH':

        channel_id = request.data.get('channel_id')
        is_public = request.data.get('is_public')

        print("PATCH channel_id:", channel_id, "is_public:", is_public)

        if channel_id is None or is_public is None:
            return Response(
                {"error": "channel_id and is_public are required."},
                status=400
            )

        try:
            channel = Channel.objects.get(
                id=channel_id,
                user=request.user
            )
        except Channel.DoesNotExist:
            return Response(
                {"error": "Channel not found."},
                status=404
            )

        channel.is_public = is_public
        channel.save()

        return Response({
            "id": channel.id,
            "is_public": channel.is_public,
            "is_public": not channel.is_public
        })


    # GET CHANNELS
    channels = Channel.objects.filter(
        native_language_id=user_settings.target_language_id
    )

    for c in channels:
        print(c.native_language)
        print(c.id, c.native_language_id)

    channels = channels.distinct()

    print("Found Channels:", list(channels))

    data = [
        {
            "id": c.id,
            "name": c.channel_name,
            "url": c.channel_url,
            "image": c.channel_img,
            "owner": c.user.username,
            "owner_id": c.user.id,
            "is_public": c.is_public,
            "is_favorite": c.is_favorite,
            "target_language": user_settings.target_language_id,
            "native_language": user_settings.target_language_id
        }
        for c in channels
    ]

    print("Found Channels:", channels)

    return Response(data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def get_video(request):

    print("User:", request.user)
    print("Authenticated:", request.user.is_authenticated)
    print("Authorization:", request.headers.get("Authorization"))

    lesson = Lesson.objects.get(
        id=request.data["lesson_id"],
        lesson_private=False,
    )

    video_path = None

    # Try normal FileField first
    if lesson.media_file and lesson.media_file.name.lower().endswith(".mp4"):
        video_path = lesson.media_file.path
        print("The current Video filepath is", video_path)

    # Fallback: build path from media_folder
    else:
        print("media_file empty, using media_folder fallback")

        video_path = os.path.join(
            settings.MEDIA_ROOT,
            lesson.media_folder,
            "video.mp4"
        )

    print("Video path:", video_path)

    if not os.path.exists(video_path):
        return Response(
            {"error": "Video file not found", "path": video_path},
            status=404
        )

    return FileResponse(
        open(video_path, "rb"),
        content_type="video/mp4"
    )



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def statistics(request):
    user = request.user

    settings = UserSetting.objects.filter(user=user).select_related(
        "target_language"
    ).first()

    target_language = (
        settings.target_language.lang_name
        if settings and settings.target_language
        else None
    )

    language = request.query_params.get("language") or target_language

    words = UserWord.objects.filter(user=user)

    if language:
        words = words.filter(word__language__lang_name=language)

    total_lessons = Lesson.objects.filter(user=user).count()
    total_words = words.count()
    total_phrases = PhraseTranslation.objects.filter(user=user).count()
    total_recordings = Recording.objects.filter(user=user).count()

    completed_lessons = UserLessonsProgress.objects.filter(
        user=user,
        current_lesson_index__gt=0
    ).count()

    words_by_date = (
        words
        .values("creation_date")
        .annotate(count=Count("id"))
        .order_by("creation_date")
    )

    languages = (
        UserWord.objects
        .filter(user=user)
        .values("word__language__lang_name")
        .annotate(count=Count("id"))
        .order_by("word__language__lang_name")
    )

    return Response({
        "selected_language": language,
        "target_language": target_language,
        "summary": {
            "lessons": total_lessons,
            "words": total_words,
            "phrases": total_phrases,
            "recordings": total_recordings,
            "completed": completed_lessons,
        },
        "words_over_time": [
            {
                "date": row["creation_date"],
                "count": row["count"],
            }
            for row in words_by_date
        ],
        "languages": list(languages),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def vocabulary(request):
    user_words = (
        UserWord.objects
        .filter(user=request.user)
        .select_related("word", "word__language", "user")
        .order_by("id")
    )

    # Pagination
    try:
        page = max(1, int(request.query_params.get("page", 1)))
        page_size = int(request.query_params.get("page_size", 25))
    except (TypeError, ValueError):
        return Response(
            {"error": "page and page_size must be integers"},
            status=status.HTTP_400_BAD_REQUEST
        )

    page_size = max(1, min(page_size, 100))

    total_words = user_words.count()
    start = (page - 1) * page_size
    end = start + page_size

    results = []

    for user_word in user_words[start:end]:
        results.append({
            "id": user_word.id,
            "word_id": user_word.word_id,
            "word": user_word.word.word,
            "language_id": user_word.word.language_id,
            "language": user_word.word.language.lang_name,
            "word_frequency": user_word.word.frequency,
            "frequency": user_word.frequency,
            "clicks": user_word.clicks,
            "creation_date": user_word.creation_date,
            "review_date": user_word.review_date,
            "last_seen": user_word.last_seen,
            "user_id": user_word.user_id,
            "username": user_word.user.username,
        })

    return Response({
        "count": total_words,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_words + page_size - 1) // page_size,
        "results": results,
    })

@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def edit_vocabulary(request, vocabulary_id):
    from django.shortcuts import get_object_or_404

    user_word = get_object_or_404(
        UserWord,
        id=vocabulary_id,
        user=request.user
    )

    word_text = request.data.get("word")
    language_id = request.data.get("language_id")

    if not isinstance(word_text, str) or not word_text.strip():
        return Response(
            {"error": "Word cannot be empty."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(word_text.strip()) > 30:
        return Response(
            {"error": "Word cannot exceed 30 characters."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if language_id is None:
        return Response(
            {"error": "Language is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        language = Language.objects.get(id=language_id)
    except (Language.DoesNotExist, ValueError, TypeError):
        return Response(
            {"error": "Invalid language."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create a separate Word so other users' records are not changed.
    updated_word = Word.objects.create(
        word=word_text.strip(),
        language=language,
        frequency=user_word.word.frequency
    )

    user_word.word = updated_word
    user_word.save(update_fields=["word"])

    return Response({
        "message": "Vocabulary updated successfully.",
        "id": user_word.id,
        "word_id": updated_word.id,
        "word": updated_word.word,
        "language_id": language.id,
        "language": language.lang_name,
    })


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_vocabulary(request, vocabulary_id):
    from django.shortcuts import get_object_or_404

    user_word = get_object_or_404(
        UserWord,
        id=vocabulary_id,
        user=request.user
    )

    user_word.delete()

    return Response(
        {"message": "Vocabulary record deleted successfully."},
        status=status.HTTP_200_OK
    )


@api_view(['GET', 'POST', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def tags(request):

    # --------------------------------------------------
    # GET
    # Get tags for a specific Lesson/Recording/Channel
    # --------------------------------------------------

    if request.method == 'GET':
        tag_type = request.query_params.get('tag_type')
        object_id = request.query_params.get('object_id')

        # No parameters = return all available tag definitions
        if not tag_type and not object_id:
            tags = Tag.objects.all().values('id', 'name').order_by('name')
            return Response(list(tags), status=status.HTTP_200_OK)

        # Both parameters are required when requesting
        # tags assigned to a specific object.
        if not tag_type or not object_id:
            return Response(
                {
                    'error': 'tag_type and object_id must be provided together.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        model_map = {
            'lesson': Lesson,
            'recording': Recording,
            'channel': Channel,
        }

        model = model_map.get(tag_type.lower())

        if not model:
            return Response(
                {'error': 'Invalid tag_type.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        obj = get_object_or_404(model, pk=object_id)

        tags = obj.tags.all().values('id', 'name')

        return Response(list(tags), status=status.HTTP_200_OK)


    # --------------------------------------------------
    # POST
    # Add an existing tag OR create a new tag
    # --------------------------------------------------
    if request.method == 'POST':

        tag_type = request.data.get('tag_type')
        object_id = request.data.get('object_id')
        tag_id = request.data.get('tag_id')
        tag_name = request.data.get('name')

        if not tag_type or not object_id:
            return Response(
                {
                    'error': 'tag_type and object_id are required.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        model_map = {
            'lesson': Lesson,
            'recording': Recording,
            'channel': Channel,
        }

        model = model_map.get(tag_type.lower())

        if not model:
            return Response(
                {
                    'error': 'Invalid tag_type.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        obj = get_object_or_404(model, pk=object_id)

        # Existing tag
        if tag_id:
            tag = get_object_or_404(Tag, pk=tag_id)

        # Create new tag
        elif tag_name:
            tag_name = tag_name.strip()

            if not tag_name:
                return Response(
                    {
                        'error': 'Tag name cannot be empty.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            tag, created = Tag.objects.get_or_create(
                name=tag_name
            )

        else:
            return Response(
                {
                    'error': 'Either tag_id or name is required.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Prevent duplicate relationship
        if obj.tags.filter(pk=tag.pk).exists():
            return Response(
                {
                    'message': 'Tag is already assigned.',
                    'tag': {
                        'id': tag.id,
                        'name': tag.name
                    }
                },
                status=status.HTTP_200_OK
            )

        obj.tags.add(tag)

        return Response(
            {
                'message': 'Tag added successfully.',
                'tag': {
                    'id': tag.id,
                    'name': tag.name
                }
            },
            status=status.HTTP_201_CREATED
        )

    # --------------------------------------------------
    # PUT
    # Update the tag name
    # --------------------------------------------------
    if request.method == 'PUT':

        tag_id = request.data.get('tag_id')
        name = request.data.get('name')

        if not tag_id or not name:
            return Response(
                {
                    'error': 'tag_id and name are required.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        name = name.strip()

        if not name:
            return Response(
                {
                    'error': 'Tag name cannot be empty.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        tag = get_object_or_404(Tag, pk=tag_id)

        # Check for duplicate tag name
        if Tag.objects.filter(
            name__iexact=name
        ).exclude(pk=tag.id).exists():

            return Response(
                {
                    'error': 'A tag with this name already exists.'
                },
                status=status.HTTP_409_CONFLICT
            )

        tag.name = name
        tag.save()

        return Response(
            {
                'message': 'Tag updated successfully.',
                'tag': {
                    'id': tag.id,
                    'name': tag.name
                }
            },
            status=status.HTTP_200_OK
        )

    # --------------------------------------------------
    # DELETE
    # Remove tag from Lesson/Recording/Channel
    # --------------------------------------------------
    if request.method == 'DELETE':

        tag_type = request.data.get('tag_type')
        object_id = request.data.get('object_id')
        tag_id = request.data.get('tag_id')

        if not tag_type or not object_id or not tag_id:
            return Response(
                {
                    'error': (
                        'tag_type, object_id, '
                        'and tag_id are required.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        model_map = {
            'lesson': Lesson,
            'recording': Recording,
            'channel': Channel,
        }

        model = model_map.get(tag_type.lower())

        if not model:
            return Response(
                {
                    'error': 'Invalid tag_type.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        obj = get_object_or_404(model, pk=object_id)
        tag = get_object_or_404(Tag, pk=tag_id)

        obj.tags.remove(tag)

        return Response(
            {
                'message': 'Tag removed successfully.'
            },
            status=status.HTTP_200_OK
        )


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def dictionary_entry(request):

    user_settings = UserSetting.objects.get(user=request.user)

    dictionary = user_settings.user_dictionary
    target_language = user_settings.target_language
    native_language = user_settings.native_language

    # ============================================================
    # GET EXISTING DICTIONARY ENTRY
    # ============================================================

    if request.method == 'GET':

        word_id = request.GET.get('word_id')

        if not word_id:
            return Response({
                'error': 'word_id is required'
            }, status=400)

        word = Word.objects.get(id=word_id)

        dictionary_entry = DictionaryEntry.objects.filter(
            word=word,
            dictionary=dictionary
        ).first()

        if not dictionary_entry:
            return Response({
                'exists': False,
                'dictionary_entry': None
            })

        return Response({
            'exists': True,
            'dictionary_entry': {
                'id': dictionary_entry.id,
                'word_id': dictionary_entry.word_id,
                'data': dictionary_entry.data,
            }
        })

    # ============================================================
    # SAVE DICTIONARY ENTRY
    # ============================================================

    if request.method == 'POST':

        data = request.data

        word_id = data.get('word_id')
        entry_data = data.get('dictionary_entry')

        print("Word ID:", word_id)
        print("Dictionary entry:", entry_data)

        word = Word.objects.get(id=word_id)

        dictionary_entry = DictionaryEntry.objects.create(
            word=word,
            dictionary=dictionary,
            target_language=target_language,
            native_language=native_language,
            data=entry_data,
        )

        return Response({
            'success': True,
            'dictionary_entry_id': dictionary_entry.id,
        })


class AIModelListView(generics.ListAPIView):
    queryset = AIModel.objects.filter(
        is_active=True
    )
    serializer_class = AIModelSerializer


BOOKS_DIR = Path(settings.BASE_DIR) / "api" / "books"

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def books_list(request):
    """
    Return every book folder inside api/books/.
    """

    books = []

    if not BOOKS_DIR.exists():
        return JsonResponse([], safe=False)

    for book_dir in sorted(BOOKS_DIR.iterdir()):
        if not book_dir.is_dir():
            continue

        books.append({
            "id": book_dir.name,
            "name": book_dir.name.replace("_", " "),
        })

    return JsonResponse(books, safe=False)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def book_detail(request, book_id):
    """
    Return the complete contents of a book:
    - book information
    - table of contents
    - every page
    - image URLs
    """

    book_dir = BOOKS_DIR / book_id

    # Prevent path traversal
    try:
        book_dir = book_dir.resolve()
        books_root = BOOKS_DIR.resolve()

        book_dir.relative_to(books_root)

    except ValueError:
        return JsonResponse(
            {"error": "Invalid book."},
            status=400
        )

    if not book_dir.is_dir():
        return JsonResponse(
            {"error": "Book not found."},
            status=404
        )

    content_dir = book_dir / "content" / "book_ocr_output"

    if not content_dir.exists():
        return JsonResponse(
            {"error": "Book content not found."},
            status=404
        )

    # ------------------------------------------------------------
    # TOC
    # ------------------------------------------------------------

    toc = []

    toc_file = content_dir / "toc.json"

    if toc_file.exists():
        try:
            with open(toc_file, "r", encoding="utf-8") as f:
                toc_data = json.load(f)

            if isinstance(toc_data, list):
                toc = toc_data

            elif isinstance(toc_data, dict):
                toc = toc_data.get("entries", [])

        except (json.JSONDecodeError, OSError):
            toc = []

    # ------------------------------------------------------------
    # PAGES
    # ------------------------------------------------------------

    pages_dir = content_dir / "pages"

    pages = []

    if pages_dir.exists():

        page_directories = sorted(
            [
                directory
                for directory in pages_dir.iterdir()
                if directory.is_dir() and
                (directory / "page.json").exists()
            ],
            key=lambda directory: directory.name
        )

        for page_dir in page_directories:
            page_file = page_dir / "page.json"
            try:
                with open(page_file, "r", encoding="utf-8") as f:
                    page_data = json.load(f)

                page_data["id"] = page_dir.name

            except (json.JSONDecodeError, OSError):
                continue

            # ----------------------------------------------------
            # Process elements
            # ----------------------------------------------------

            for element in page_data.get("elements", []):

                bbox = element.get("bbox")

                if bbox and len(bbox) >= 4:
                    x1, y1, x2, y2 = bbox

                    element["x"] = x1
                    element["y"] = y1
                    element["width"] = x2 - x1
                    element["height"] = y2 - y1

                # ------------------------------------------------
                # Image URL
                # ------------------------------------------------

                if element.get("type") == "image":

                    filename = element.get("filename")

                    if filename:
                        filename = filename.replace("\\", "/")

                        element["filename"] = filename

                        element["image_url"] = (
                            f"/api/books/"
                            f"{book_id}/"
                            f"pages/"
                            f"{page_dir.name}/"
                            f"images/"
                            f"{filename}"
                        )

            pages.append(page_data)

    # ------------------------------------------------------------
    # Return entire book
    # ------------------------------------------------------------

    return JsonResponse({
        "id": book_id,
        "name": book_id.replace("_", " "),
        "toc": toc,
        "pages": pages,
    })


BOOKS_DIR = Path(settings.BASE_DIR) / "api" / "books"


def serve_book_image(request, book_id, page, path):

    books_root = BOOKS_DIR.resolve()

    book_root = (
        BOOKS_DIR / book_id
    ).resolve()

    try:
        book_root.relative_to(books_root)
    except ValueError:
        raise Http404


    image_file = (
        book_root
        / "content"
        / "book_ocr_output"
        / "pages"
        / page
        / "images"
        / path
    ).resolve()


    try:
        image_file.relative_to(book_root)
    except ValueError:
        raise Http404


    if not image_file.is_file():
        raise Http404


    return FileResponse(
        open(image_file, "rb")
    )

def append_wav(existing_wav, new_wav):

    existing = wave.open(io.BytesIO(existing_wav), 'rb')
    new = wave.open(io.BytesIO(new_wav), 'rb')

    if (
        existing.getnchannels() != new.getnchannels()
        or existing.getsampwidth() != new.getsampwidth()
        or existing.getframerate() != new.getframerate()
    ):
        existing.close()
        new.close()
        raise ValueError("WAV files have different audio formats.")

    output = io.BytesIO()

    with wave.open(output, 'wb') as wav:
        wav.setnchannels(existing.getnchannels())
        wav.setsampwidth(existing.getsampwidth())
        wav.setframerate(existing.getframerate())

        wav.writeframes(existing.readframes(existing.getnframes()))
        wav.writeframes(new.readframes(new.getnframes()))

    existing.close()
    new.close()

    return output.getvalue()

def get_wav_duration_ms(wav_data):

    wav = wave.open(io.BytesIO(wav_data), 'rb')

    frames = wav.getnframes()
    frame_rate = wav.getframerate()

    duration_ms = int((frames / frame_rate) * 1000)

    wav.close()

    return duration_ms

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_audio(request):

    user_id = request.user.id
    lesson_id = request.data.get('lesson_id')

    print(request.data)
    print("user id:", user_id)
    print("lesson id:", lesson_id)

    lesson = Lesson.objects.filter(
        id=lesson_id,
        user=user_id
    ).first()

    if not lesson:
        return Response({
            'success': False,
            'message': 'Lesson not found.'
        }, status=404)

    print("Lesson Title:", lesson.title)
    print("Media File:", lesson.media_file)
    print("Video Format:", lesson.videoFormat)
    print("Audio Generated:", lesson.audioGenerated)
    print("Sentence Reordered:", lesson.sentencesReordered)

    sentences = Sentence.objects.filter(
        lesson=lesson
    ).order_by('position')

    print("sentence count:", sentences.count())

    if not sentences.exists():
        return Response({
            'success': False,
            'message': 'Lesson has no sentences.'
        }, status=400)

    # ------------------------------------------------------------
    # TTS
    # ------------------------------------------------------------

    from api.tts import TTS

    #tts = TTS()

    combined_audio = None
    current_position_ms = 0

    for sentence in sentences:

        print(
            sentence.id,
            sentence.position,
            sentence.sentence
        )

        # Generate audio for this sentence
        model_id = get_tts_model_id(lesson.target_language.lang_name)

        sentence_audio = synthesize_audio_bytes(
            model_id,
            sentence.sentence
        )
        # Get duration of this sentence
        duration_ms = get_wav_duration_ms(sentence_audio)

        start_ms = current_position_ms
        end_ms = current_position_ms + duration_ms

        # Store timing on the sentence
        sentence.start_ms = start_ms
        sentence.end_ms = end_ms
        sentence.save(update_fields=['start_ms', 'end_ms'])

        print(
            f"Sentence {sentence.id}: "
            f"{start_ms}ms -> {end_ms}ms "
            f"({duration_ms}ms)"
        )

        # Append this sentence to the combined audio
        if combined_audio is None:

            combined_audio = sentence_audio

        else:

            combined_audio = append_wav(
                combined_audio,
                sentence_audio
            )

        current_position_ms = end_ms

    # ------------------------------------------------------------
    # Convert combined WAV to MP3
    # ------------------------------------------------------------

    try:

        result = subprocess.run(
            [
                'ffmpeg',
                '-y',
                '-f', 'wav',
                '-i', 'pipe:0',
                '-f', 'mp3',
                '-codec:a', 'libmp3lame',
                '-b:a', '192k',
                'pipe:1'
            ],
            input=combined_audio,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True
        )

        mp3_audio = result.stdout

    except subprocess.CalledProcessError as error:

        print("FFmpeg error:")
        print(error.stderr.decode(errors='ignore'))

        return Response({
            'success': False,
            'message': 'Failed to convert generated audio to MP3.'
        }, status=500)

    # ------------------------------------------------------------
    # Save audio
    # ------------------------------------------------------------

    uuid_folder = str(lesson.uuid)

    audio_path = f"lessons/{uuid_folder}/{lesson.uuid}.mp3"

    print("Audio path:", audio_path)

    # Remove existing audio if necessary
    if default_storage.exists(audio_path):
        default_storage.delete(audio_path)

    default_storage.save(
        audio_path,
        ContentFile(mp3_audio)
    )

    # ------------------------------------------------------------
    # Update lesson
    # ------------------------------------------------------------

    lesson.media_file.name = audio_path
    lesson.media_folder = f"lessons/{uuid_folder}"
    lesson.audioGenerated = True

    lesson.save(update_fields=[
        'media_file',
        'media_folder',
        'audioGenerated'
    ])

    print("Audio generated successfully.")
    print("Audio file:", lesson.media_file.name)
    print("Audio folder:", lesson.media_folder)
    print("Total duration:", current_position_ms, "ms")

    return Response({
        'success': True,
        'lesson_id': lesson.id,
        'sentence_count': sentences.count(),
        'audio_file': lesson.media_file.name,
        'duration_ms': current_position_ms,
    }, status=200)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def rss_feed(request):
    reader = RSSReader()

    try:
        feed_id = request.query_params.get("feed_id")

        if feed_id:
            try:
                feed_id = int(feed_id)
            except (TypeError, ValueError):
                return Response(
                    {"error": "Invalid feed_id."},
                    status=400
                )

            try:
                settings = UserSetting.objects.get(user=request.user)
            except UserSetting.DoesNotExist:
                return Response(
                    {"error": "User settings were not found."},
                    status=404
                )

            feed = RSSFeed.objects.filter(
                id=feed_id,
                native_language_id=settings.target_language_id
            ).filter(
                Q(user=request.user) | Q(is_public=True)
            ).first()

            if not feed:
                return Response(
                    {"error": "RSS feed not found or unavailable."},
                    status=404
                )

            if not feed.rssfeed_url:
                return Response(
                    {"error": "This RSS feed does not have a URL."},
                    status=400
                )

            rss_data = reader.get_rss_data(feed.rssfeed_url)
            rss_data["feed_title"] = feed.rssfeed_name

        else:
            rss_data = reader.get_rss_data()

        return Response(rss_data)

    except requests.RequestException:
        return Response(
            {"error": "Could not retrieve the RSS feed."},
            status=502
        )



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def rss_article(request):
    url = request.query_params.get("url", "")

    if not url:
        return Response( {"error": "An article URL is required."}, status=400 )

    reader = RSSReader()

    try:
        article_data = reader.get_article_data(url)
        return Response(article_data)

    except ValueError:
        return Response( {"error": "Invalid LRT article URL."}, status=400 )

    except requests.RequestException:
        return Response( {"error": "Could not retrieve the article from LRT."}, status=502 )



# Get RSS feeds for the user's target language
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def rss_feeds(request):
    try:
        user_settings = UserSetting.objects.get(user=request.user)
    except UserSetting.DoesNotExist:
        return Response(
            {"error": "User settings were not found."},
            status=404
        )

    language_id = user_settings.target_language_id

    feeds = RSSFeed.objects.filter(
        native_language_id=language_id
    ).filter(
        Q(user=request.user) | Q(is_public=True)
    ).order_by("rssfeed_name")

    data = [
        {
            "id": feed.id,
            "name": feed.rssfeed_name,
            "url": feed.rssfeed_url,
            "image": feed.rssfeed_img,
            "is_public": feed.is_public,
            "is_favorite": feed.is_favorite,
        }
        for feed in feeds
    ]

    return Response({
        "target_language": user_settings.target_language.lang_name,
        "feeds": data,
    })

@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def rss_feed_create(request):
    feed_name = request.data.get("rssfeed_name", "").strip()
    feed_url = request.data.get("rssfeed_url", "").strip()
    is_public_value = request.data.get("is_public", "false")

    is_public = str(is_public_value).lower() in ("true", "1", "yes")

    if not feed_name or not feed_url:
        return Response(
            {"error": "A feed name and RSS URL are required."},
            status=400
        )

    if len(feed_name) > 30:
        return Response(
            {"error": "The feed name cannot exceed 30 characters."},
            status=400
        )

    from urllib.parse import urlparse

    parsed_url = urlparse(feed_url)

    if (
        parsed_url.scheme not in ("http", "https")
        or not parsed_url.netloc
        or parsed_url.username
        or parsed_url.password
    ):
        return Response(
            {"error": "Please enter a valid RSS feed URL."},
            status=400
        )

    try:
        settings = UserSetting.objects.get(user=request.user)
    except UserSetting.DoesNotExist:
        return Response(
            {"error": "User settings were not found."},
            status=404
        )

    rss_feed = RSSFeed.objects.create(
        user=request.user,
        native_language_id=settings.target_language_id,
        rssfeed_name=feed_name,
        rssfeed_url=feed_url,
        is_public=is_public,
    )

    return Response(
        {
            "id": rss_feed.id,
            "name": rss_feed.rssfeed_name,
            "url": rss_feed.rssfeed_url,
            "image": rss_feed.rssfeed_img,
            "is_public": rss_feed.is_public,
            "is_favorite": rss_feed.is_favorite,
        },
        status=201
    )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reading_level_scales(request):
    scales = ReadingLevelScale.objects.all().order_by('name')

    data = [
        {
            'id': scale.id,
            'name': scale.name,
            'code': scale.code,
            'measurement_type': scale.measurement_type,
        }
        for scale in scales
    ]

    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reading_levels(request):
    print("READING_LEVELS VIEW REACHED")
    scale_id = request.query_params.get('scale_id')

    levels = ReadingLevel.objects.all()

    if scale_id:
        levels = levels.filter(scale_id=scale_id)

    data = [
        {
            'id': level.id,
            'name': level.name,
            'value': level.value,
            'sort_order': level.sort_order,
            'scale_id': level.scale_id,
        }
        for level in levels
    ]

    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def grammar_categories(request):
    categories = GrammarCategory.objects.all()

    data = [
        {
            'id': category.id,
            'name': category.name,
            'description': category.description,
            'sort_order': category.sort_order,
        }
        for category in categories
    ]

    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def grammar_exercise_types(request):
    exercise_types = GrammarExerciseType.objects.all()

    data = [
        {
            'id': exercise_type.id,
            'name': exercise_type.name,
            'code': exercise_type.code,
            'description': exercise_type.description,
        }
        for exercise_type in exercise_types
    ]

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def grammar_topics(request):
    settings = UserSetting.objects.filter(user=request.user).first()

    if not settings or not settings.target_language:
        return Response([])

    topics = GrammarTopic.objects.filter(
        target_language=settings.target_language,
        is_active=True,
    ).filter(
        Q(owner__isnull=True) | Q(owner=request.user)
    ).select_related('category', 'target_language')

    data = [
        {
            'id': topic.id,
            'title': topic.title,
            'description': topic.description,
            'category_id': topic.category_id,
            'category_name': topic.category.name,
            'target_language_id': topic.target_language_id,
            'target_language': topic.target_language.lang_name,
            'sort_order': topic.sort_order,
        }
        for topic in topics
    ]

    return Response(data)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def grammar_lessons(request):
    settings = UserSetting.objects.filter(user=request.user).first()

    if not settings or not settings.target_language:
        return Response([])

    print("Grammar target language:", settings.target_language)
    print("Published lessons:", GrammarLesson.objects.filter(
        is_published=True
    ).count())
    print("Public lessons:", GrammarLesson.objects.filter(
        is_public=True
    ).count())
    lessons = GrammarLesson.objects.filter(
        topic__target_language=settings.target_language,
        topic__is_active=True,
        is_published=True,
    ).filter(
        Q(is_public=True) | Q(topic__owner=request.user)
    ).select_related(
        'topic',
        'topic__category',
        'topic__target_language',
        'explanation_language',
        'reading_level',
    )

    attempts = GrammarAttempt.objects.filter(
        user=request.user,
        lesson__in=lessons,
    ).values(
        'lesson_id',
        'answers',
        'is_submitted',
        'score',
    )

    attempts_by_lesson = {
        attempt['lesson_id']: attempt
        for attempt in attempts
    }

    data = []

    for lesson in lessons:
        attempt = attempts_by_lesson.get(lesson.id, {})
        answers = attempt.get('answers') or {}

        total_exercises = lesson.exercises.count()

        answered_exercises = sum(
            1
            for answer in answers.values()
            if isinstance(answer, str) and answer.strip()
        )

        completed = attempt.get('is_submitted', False)

        progress = (
            round(answered_exercises / total_exercises * 100, 1)
            if total_exercises > 0
            else 0
        )

        if completed:
            progress = 100

        data.append({
            'id': lesson.id,
            'is_owner': lesson.topic.owner_id == request.user.id,
            'is_public': lesson.is_public,
            'is_published': lesson.is_published,
            'title': lesson.title,
            'topic_id': lesson.topic_id,
            'topic_title': lesson.topic.title,
            'category_name': lesson.topic.category.name,
            'target_language': lesson.topic.target_language.lang_name,
            'explanation_language': lesson.explanation_language.lang_name,
            'reading_level_id': lesson.reading_level_id,
            'reading_level': (
                lesson.reading_level.name
                if lesson.reading_level else None
            ),
            'completed': completed,
            'answered_exercises': answered_exercises,
            'score': attempt.get('score'),
            'total_exercises': total_exercises,
            'progress': progress,
        })

    return Response(data)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def grammar_lesson_detail(request, lesson_id):
    lesson = get_object_or_404(
        GrammarLesson.objects.select_related(
            'topic',
            'topic__category',
            'topic__target_language',
            'explanation_language',
            'reading_level',
        ).prefetch_related('exercises'),
        id=lesson_id,
        is_published=True,
        topic__is_active=True,
    )

    if not lesson.is_public and lesson.topic.owner != request.user:
        return Response(
            {'detail': 'Not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == 'DELETE':
        if lesson.topic.owner != request.user:
            return Response(
                {'error': 'You do not have permission to delete this lesson.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        lesson.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    data = {
        'id': lesson.id,
        'audio_directory': lesson.audio_directory,
        'audio_timestamps': {
            timestamp.segment_id: {
                'start': timestamp.start,
                'end': timestamp.end,
            }
            for timestamp in lesson.audio_timestamps.all()
        },
        'title': lesson.title,
        'topic_id': lesson.topic_id,
        'topic_title': lesson.topic.title,
        'category_name': lesson.topic.category.name,
        'target_language': lesson.topic.target_language.lang_name,
        'explanation_language': lesson.explanation_language.lang_name,
        'reading_level_id': lesson.reading_level_id,
        'reading_level': lesson.reading_level.name if lesson.reading_level else None,
        'learning_objectives': lesson.learning_objectives,
        'sections': lesson.sections,
        'is_owner': lesson.topic.owner_id == request.user.id,
        'is_public': lesson.is_public,
        'examples': lesson.examples,
        'exercises': [
            {
                'id': exercise.id,
                'exercise_type': exercise.exercise_type.code,
                'instruction': exercise.instruction,
                'question': exercise.question,
                'options': exercise.options,
                'correct_answer': exercise.correct_answer,
                'accepted_answers': exercise.accepted_answers,
                'explanation': exercise.explanation,
                'correctable': exercise.correctable,
                'translation': exercise.translation,
                'missing_word': exercise.missing_word,
                'complete_answer': exercise.complete_answer,
                'incorrect_sentence': exercise.incorrect_sentence,
                'corrected_sentence': exercise.corrected_sentence,
            }
            for exercise in lesson.exercises.all()
        ],
    }

    return Response(data)

# Import a grammar lesson from JSON
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def import_grammar_lesson(request):
    data = request.data

    required_fields = [
        'target_language',
        'explanation_language',
        'category',
        'topic',
        'title',
    ]

    missing_fields = [
        field for field in required_fields
        if not data.get(field)
    ]

    if missing_fields:
        return Response(
            {
                'error': 'Missing required fields.',
                'fields': missing_fields,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not isinstance(data.get('learning_objectives', []), list):
        return Response(
            {'error': 'learning_objectives must be a list.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not isinstance(data.get('sections', []), list):
        return Response(
            {'error': 'sections must be a list.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not isinstance(data.get('examples', []), list):
        return Response(
            {'error': 'examples must be a list.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not isinstance(data.get('exercises', []), list):
        return Response(
            {'error': 'exercises must be a list.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    is_admin = request.user.is_staff or request.user.is_superuser

    try:
        target_language = Language.objects.get(
            lang_name=data['target_language']
        )

        explanation_language = Language.objects.get(
            lang_name=data['explanation_language']
        )

        category, _ = GrammarCategory.objects.get_or_create(
            name=data['category'],
        )

        reading_level = None
        reading_level_name = data.get('reading_level')

        if reading_level_name:
            reading_level = ReadingLevel.objects.filter(
                name=reading_level_name
            ).first()

            if not reading_level:
                return Response(
                    {
                        'error': (
                            f'Reading level "{reading_level_name}" '
                            'was not found.'
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        with transaction.atomic():
            topic_owner = request.user

            topic, _ = GrammarTopic.objects.get_or_create(
                category=category,
                target_language=target_language,
                owner=topic_owner,
                title=data['topic'],
                defaults={
                    'description': data.get('topic_description', ''),
                    'is_active': True,
                },
            )

            lesson = GrammarLesson.objects.create(
                topic=topic,
                explanation_language=explanation_language,
                reading_level=reading_level,
                title=data['title'],
                learning_objectives=data.get(
                    'learning_objectives', []
                ),
                sections=data.get('sections', []),
                examples=data.get('examples', []),
                is_published=is_admin and data.get('publish', True),
            )

            exercises = data.get('exercises', [])

            for index, exercise in enumerate(exercises):
                required_exercise_fields = [
                    'exercise_type',
                    'instruction',
                    'question',
                    'correct_answer',
                    'explanation',
                ]

                missing_exercise_fields = [
                    field for field in required_exercise_fields
                    if not exercise.get(field)
                ]

                if missing_exercise_fields:
                    raise ValueError(
                        f'Exercise {index + 1} is missing: '
                        + ', '.join(missing_exercise_fields)
                    )

                exercise_type = GrammarExerciseType.objects.filter(
                    code=exercise['exercise_type']
                ).first()

                if not exercise_type:
                    raise ValueError(
                        f'Exercise {index + 1} has an invalid exercise_type: '
                        f'{exercise["exercise_type"]}'
                    )

                GrammarExercise.objects.create(
                    lesson=lesson,
                    exercise_type=exercise_type,
                    instruction=exercise['instruction'],
                    question=exercise['question'],
                    options=exercise.get('options', []),
                    correct_answer=exercise['correct_answer'],
                    accepted_answers=exercise.get(
                        'accepted_answers', []
                    ),
                    explanation=exercise['explanation'],
                    correctable=exercise.get('correctable', True),
                    translation=exercise.get('translation', ''),
                    missing_word=exercise.get('missing_word', ''),
                    complete_answer=exercise.get('complete_answer', ''),
                    incorrect_sentence=exercise.get(
                        'incorrect_sentence', ''
                    ),
                    corrected_sentence=exercise.get(
                        'corrected_sentence', ''
                    ),
                    sort_order=index,
                )

        
        from api.tts import TTS
        from pathlib import Path

        # ------------------------------------------------------------
        # Generate grammar lesson audio
        # ------------------------------------------------------------

        model_id = get_tts_model_id(lesson.target_language.lang_name)

        audio_segments = get_grammar_audio_segments(lesson)

        if audio_segments:

            audio_result = synthesize_with_timestamps(
                model_id,
                audio_segments,
            )

            audio_directory = (
                Path(__file__).resolve().parent
                / 'media'
                / 'grammar'
                / str(lesson.id)
            )

            audio_directory.mkdir(
                parents=True,
                exist_ok=True,
            )

            audio_path = audio_directory / 'audio.wav'

            with open(audio_path, 'wb') as audio_file:
                audio_file.write(audio_result['audio'])

            # Save timestamps in the database instead of JSON.
            timestamps = audio_result['segments']

            GrammarAudioTimestamp.objects.filter(
                lesson=lesson
            ).delete()

            GrammarAudioTimestamp.objects.bulk_create([
                GrammarAudioTimestamp(
                    lesson=lesson,
                    segment_id=segment_id,
                    start=timestamp['start'],
                    end=timestamp['end'],
                )
                for segment_id, timestamp in timestamps.items()
            ])

            lesson.audio_directory = (
                f'media/grammar/{lesson.id}'
            )
            lesson.save(update_fields=['audio_directory'])


        return Response(
            {
                'message': 'Grammar lesson imported successfully.',
                'lesson_id': lesson.id,
                'title': lesson.title,
                'is_published': lesson.is_published,
                'is_private': topic.owner is not None,
            },
            status=status.HTTP_201_CREATED,
        )

    except Language.DoesNotExist:
        return Response(
            {'error': 'The specified language was not found.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    except ValueError as err:
        return Response(
            {'error': str(err)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as e:
        import traceback
        traceback.print_exc()

        return Response(
            {'error': f'The lesson could not be imported: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def grammar_attempt(request, lesson_id):
    from django.utils import timezone
    from .models import GrammarAttempt

    lesson = get_object_or_404(
        GrammarLesson.objects.filter(
            is_published=True,
            topic__is_active=True,
        ),
        id=lesson_id,
    )

    # Ensure the user can access this lesson.
    if not lesson.is_public and lesson.topic.owner != request.user:
        return Response(
            {'error': 'You do not have access to this lesson.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    attempt, _ = GrammarAttempt.objects.get_or_create(
        user=request.user,
        lesson=lesson,
    )

    if request.method == 'POST' and request.data.get('reset', False):
        attempt.answers = {}
        attempt.is_submitted = False
        attempt.score = None
        attempt.submitted_at = None
        attempt.save()

        return Response({
            'message': 'Lesson reset successfully.',
            'answers': attempt.answers,
            'is_submitted': attempt.is_submitted,
            'score': attempt.score,
            'submitted_at': attempt.submitted_at,
        })

    if request.method == 'GET':
        return Response({
            'lesson_id': lesson.id,
            'answers': attempt.answers,
            'is_submitted': attempt.is_submitted,
            'score': attempt.score,
            'submitted_at': attempt.submitted_at,
        })

    if attempt.is_submitted:
        return Response(
            {'error': 'This lesson has already been submitted.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    answers = request.data.get('answers', {})
    submit = request.data.get('submit', False)

    if not isinstance(answers, dict):
        return Response(
            {'error': 'Answers must be an object.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    exercises = list(lesson.exercises.all())
    exercise_ids = {str(exercise.id) for exercise in exercises}

    # Reject answer IDs that do not belong to this lesson.
    if not set(answers.keys()).issubset(exercise_ids):
        return Response(
            {'error': 'One or more answers do not belong to this lesson.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Keep only non-empty string answers.
    if any(
        not isinstance(answer, str)
        for answer in answers.values()
    ):
        return Response(
            {'error': 'Each answer must be a string.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    answers = {
        key: value
        for key, value in answers.items()
        if value.strip()
    }

    if submit:
        if not exercises:
            return Response(
                {'error': 'This lesson has no exercises to submit.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if any(str(exercise.id) not in answers for exercise in exercises):
            return Response(
                {'error': 'Answer every exercise before submitting.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        score = 0

        for exercise in exercises:
            user_answer = answers[str(exercise.id)].strip().casefold()

            accepted_answers = [
                exercise.correct_answer,
                *(exercise.accepted_answers or []),
            ]

            if (
                exercise.exercise_type == 'sentence_correction'
                and exercise.corrected_sentence
            ):
                accepted_answers.append(exercise.corrected_sentence)

            if any(
                user_answer == str(answer).strip().casefold()
                for answer in accepted_answers
            ):
                score += 1

        attempt.answers = answers
        attempt.is_submitted = True
        attempt.score = score
        attempt.submitted_at = timezone.now()
    else:
        attempt.answers = answers

    attempt.save()

    return Response({
        'message': 'Submission successful.' if submit else 'Progress saved.',
        'answers': attempt.answers,
        'is_submitted': attempt.is_submitted,
        'score': attempt.score,
        'total_exercises': len(exercises),
        'submitted_at': attempt.submitted_at,
    })

def get_grammar_audio_segments(lesson):
    segments = []

    def extract(value):
        if isinstance(value, dict):
            if (
                value.get('type') == 'target_text'
                and value.get('id')
                and value.get('text')
            ):
                segments.append({
                    'id': value['id'],
                    'text': value['text'],
                })
                return

            for key, child in value.items():
                if key not in (
                    'options',
                    'correct_answer',
                    'accepted_answers',
                ):
                    extract(child)

        elif isinstance(value, list):
            for item in value:
                extract(item)

    extract({
        'title': lesson.title,
        'learning_objectives': lesson.learning_objectives,
        'sections': lesson.sections,
        'examples': lesson.examples,
    })

    return segments