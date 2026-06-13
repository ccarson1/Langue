# backend/api/views.py

import subprocess

from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, parser_classes
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.hashers import make_password
from django.contrib.auth.hashers import check_password
from .models import User, Language, UserSetting, Word, WordTranslation, Lesson, UserLessonsProgress, Profile, Sentence, UserWord
from .serializers import UserSerializer, SignupSerializer, LanguageSerializer, LessonSerializer, UserLessonsProgressSerializer
from django.views.generic import TemplateView
from .w_translate import translate_word

from django.http import FileResponse, JsonResponse
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

lesson_import_progress = {} 
RECORDINGS = {}

BASE_NEW_WORD_FREQUENCY = 5.0
WORD_INCREASE_FREQUENCY = 0.5



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

        # Return an array of definitions
        definitions = [t.definition for t in translations]
        print(f"Definitions from DB: {definitions}")
        print(f"Definitions IDs: {[t.id for t in translations]}")
        response_data = { 'translated': definitions, 'inDatabase': 1, 'translation_ids': [t.id for t in translations]}
        print(f"Response data: {response_data}")
        return Response(response_data)

        # data = [ { "id": t.id, "definition": t.definition } for t in translations ]

        # print(f"Definitions from DB: {[d['definition'] for d in data]}")
        # print(f"Definition IDs: {[d['id'] for d in data]}")

        # return Response({ "translated": data, "inDatabase": 1 })
    
    
    # -----------------------------------
    # DICTIONARY FALLBACK
    # -----------------------------------

    user_setting = UserSetting.objects.filter(
        user=request.user
    ).first()

    dictionary_name = None

    if user_setting:
        dictionary_name = user_setting.dictionary_name

    if dictionary_name:

        try:
            

            lang_code = target_language.yt_dlp_lang
            

            dictionary_path = os.path.join(
                settings.BASE_DIR,
                'dictionaries',
                lang_code,
                dictionary_name
            )

            print(dictionary_path)

            with open(dictionary_path, 'r', encoding='utf-8') as f:
                dictionary_data = json.load(f)

            search_word = text.strip().lower()

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

                        return Response({
                            'translated': [definition],
                            'inDatabase': 0,
                            'fromDictionary': 1
                        })

        except Exception as e:

            print('Dictionary lookup error:', e)

    # Replace with your translation function:
    translated_text = translate_word(text, src_lang=target_language.yt_dlp_lang, tgt_lang=native_language.yt_dlp_lang  )

    return Response({'translated': translated_text, 'inDatabase': 0})



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

            audioUploaded = request.data.get('audioUploaded')
            lessonPrivate = request.data.get( 'lessonPrivate', 'false' ).lower() in ['true', '1', 'yes']

            fileUploaded = request.data.get( 'fileUploaded', 'false' ).lower() in ['true', '1', 'yes']

            urlReference = request.data.get( 'urlReference', 'false' ).lower() in ['true', '1', 'yes']
            imageReference = request.data.get( 'imageReference', 'false' ).lower() in ['true', '1', 'yes']

            lesson_file = request.FILES.get('file')
            audio_file = request.FILES.get('audio')
            image_file = request.FILES.get('image')

            nativeLang = get_object_or_404( Language, lang_name=nativeLangName )
            targetLang = get_object_or_404( Language, lang_name=targetLangName )

            user_id = request.user.id
            lesson_import_progress[user_id] = 0

            # CREATE LESSON
            lesson = Lesson.objects.create(
                user=request.user,
                url=url,
                native_language=nativeLang,
                target_language=targetLang,
                lesson_private=lessonPrivate,
                urlReference=urlReference,
                title=title
            )

            # SAVE IMAGE
            if image_file:
                lesson.image = image_file
                lesson.save()

            # YOUTUBE IMAGE
            elif "youtube" in (url or "").lower():

                success = download_youtube_image(url, lesson)

                if not success:
                    raise Exception(
                        "Failed to download YouTube thumbnail"
                    )

            UserLessonsProgress.objects.get_or_create(
                user=request.user,
                lesson=lesson,
                defaults={
                    'current_lesson_index': 0,
                    'last_viewed': timezone.now()
                }
            )

            lesson_import_progress[user_id] = 5

            # URL IMPORT
            if urlReference:

                save_lesson_media = URL_VTT(
                    lesson.url,
                    lesson.id,
                    lesson.target_language.id,
                    lesson.native_language.id,
                    lesson_import_progress,
                    user_id
                )

                success = save_lesson_media.process_lesson()
                if not success:
                    raise Exception(
                        "YouTube processing failed"
                    )

                lesson.audio_folder = (
                    save_lesson_media.AUDIO_DIR
                )

                lesson.save()

            # FILE IMPORT
            if fileUploaded and audioUploaded:

                if lesson_file:
                    lesson.doc_file = lesson_file

                if audio_file:
                    lesson.audio_file = audio_file

                lesson.save()
                save_lesson_media = VTT( lesson_file, audio_file, lesson.id, targetLang, nativeLang )
                csv_path = save_lesson_media.save_csv( lesson_file )

                if not csv_path:
                    raise Exception(
                        "CSV generation failed"
                    )

                audio_success = ( save_lesson_media.save_audio_as_mp3( audio_file ) )

                if not audio_success:
                    raise Exception(
                        "Audio conversion failed"
                    )

                split_success = ( save_lesson_media.split_audio_by_csv_ms( csv_path=csv_path ) )

                # if not split_success:
                #     raise Exception(
                #         "Audio splitting failed"
                #     )

                lesson.audio_folder = ( save_lesson_media.AUDIO_DIR )
                lesson.save()

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
    lessons = Lesson.objects.filter(target_language_id=target_lang_id, user=user)
    serializer = LessonSerializer(lessons, many=True, context={'request': request})
    return Response(serializer.data)

def str_to_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() == 'true'
    return False

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser]) 
def edit_lesson(request, lesson_id):

    try:
        lesson = Lesson.objects.get( id=lesson_id, user=request.user )
    except Lesson.DoesNotExist:
        return Response(
            {'error': 'Lesson not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':

        sentences = Sentence.objects.filter(lesson=lesson)

        data = {
            'id': lesson.id,
            'title': lesson.title,
            'url': lesson.url,
            'lesson_private': lesson.lesson_private,

            'sentences': [
                {
                    'id': s.id,
                    'sentence': s.sentence,
                    'start_ms': s.start_ms,
                    'end_ms': s.end_ms,
                    'translated_sentence': s.translated_sentence
                }
                for s in sentences
            ]
        }

        return Response(data)

    elif request.method == 'PUT':

        print("FILES:", request.FILES)
        print("DATA:", request.data)

        lesson.title = request.data.get( 'title', lesson.title )
        lesson.url = request.data.get( 'url', lesson.url )
        lesson.lesson_private = str_to_bool(request.data.get('lesson_private'))

        if 'audio_file' in request.FILES:
            lesson.audio_file = request.FILES.get('audio_file')

        lesson.save()

        incoming_sentences = request.data.get( 'sentences', [] )

        if isinstance(incoming_sentences, str):
            incoming_sentences = json.loads(incoming_sentences)

        for s in incoming_sentences:

            try:
                sentence_obj = Sentence.objects.get( id=s['id'], lesson=lesson )
                sentence_obj.sentence = s.get( 'sentence', sentence_obj.sentence )
                sentence_obj.start_ms = s.get( 'start_ms', sentence_obj.start_ms )
                sentence_obj.end_ms = s.get( 'end_ms', sentence_obj.end_ms )
                sentence_obj.translated_sentence = s.get( 'translated_sentence', sentence_obj.translated_sentence )

                sentence_obj.save()

            except Sentence.DoesNotExist:
                continue

        return Response({
            'message': 'Lesson updated successfully'
        })


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

    if request.method == 'GET':
        try:
            settings = UserSetting.objects.get(user=user)
            data = {
                'native_language': settings.native_language.lang_name,  # or id if you prefer
                'target_language': settings.target_language.lang_name,
                'notifications': settings.notifications,
                'dictionary_name': settings.dictionary_name,
                'user_set_volume': settings.user_set_volume,
                'user_set_speed': settings.user_set_speed,
                'repeat_audio': settings.repeat_audio,
                'repeat_audio_all': settings.repeat_audio_all,
                'shuffle_audio': settings.shuffle_audio,
                # add more fields as needed
            }
            return Response(data)

        except UserSetting.DoesNotExist:
            return Response({'error': 'Settings not found'}, status=404)

    elif request.method == 'PUT':
        native_id = request.data.get('native_language')
        target_id = request.data.get('target_language')
        notifications = request.data.get('notifications')
        dictionary_name = request.data.get('dictionary_name')
        user_set_volume = request.data.get('user_set_volume')
        user_set_speed = request.data.get('user_set_speed')
        repeat_audio = request.data.get('repeat_audio')
        repeat_audio_all = request.data.get('repeat_audio_all')
        shuffle_audio = request.data.get('shuffle_audio')

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
            settings.native_language = native_lang
            settings.target_language = target_lang
            settings.notifications = bool(notifications)
            settings.dictionary_name = dictionary_name
            settings.user_set_volume = float(user_set_volume) if user_set_volume is not None else settings.user_set_volume
            settings.user_set_speed = float(user_set_speed) if user_set_speed is not None else settings.user_set_speed
            settings.repeat_audio = repeat_audio if repeat_audio is not None else settings.repeat_audio
            settings.repeat_audio_all = repeat_audio_all if repeat_audio_all is not None else settings.repeat_audio_all
            settings.shuffle_audio = shuffle_audio if shuffle_audio is not None else settings.shuffle_audio
            settings.save()

            return Response({'message': 'Settings updated successfully'})
        except Language.DoesNotExist:
            return Response({'error': 'Invalid language ID'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
@api_view(['GET'])
def get_dictionaries(request):

    language = request.GET.get('language')

    if not language:
        return Response([])

    # convert language name to folder code
    lang_map = {
        'Lithuanian': 'lt',
        'Russian': 'ru',
    }

    lang_code = lang_map.get(language)

    if not lang_code:
        return Response([])

    dictionary_dir = os.path.join(
        settings.BASE_DIR,
        'dictionaries',
        lang_code
    )

    if not os.path.exists(dictionary_dir):
        return Response([])

    dictionaries = []

    for file in os.listdir(dictionary_dir):

        if file.endswith('.json'):

            dictionaries.append({
                'label': file.replace('.json', ''),
                'value': file
            })

    return Response(dictionaries)

@csrf_exempt 
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def account(request):
    user = request.user

    if request.method == 'GET':
        data = {
            'username': user.username,
            'email': user.email,
            # Do not include password or sensitive info
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
        return Response({'message': 'Account updated successfully.'}, status=status.HTTP_200_OK)
    


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
        progress, created = UserLessonsProgress.objects.update_or_create(
            user=user,
            lesson_id=lesson.id,
            defaults={
                "current_lesson_index": current_index,
                "last_viewed": timezone.now(),
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
                    "target_lang": target_language_id
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
            "doc_file": lesson.doc_file.url if lesson.doc_file else None,
            "audio_file": lesson.audio_file.url if lesson.audio_file else None,
            "native_language": native_language_id,
            "target_language": target_language_id,
            "sentences": [
                {
                    "id": s.id,
                    "audio_file": s.audio_file,
                    "sentence": s.sentence,
                    "translated_sentence": s.translated_sentence,
                    "start_ms": s.start_ms,
                    "end_ms": s.end_ms
                }
                for s in sentences
            ]
        }

        print(lesson_data['sentences'])

        return Response(lesson_data, status=status.HTTP_200_OK)

    except Lesson.DoesNotExist:
        return Response({'error': 'Lesson not found'}, status=status.HTTP_404_NOT_FOUND)
    
@csrf_exempt  # ✅ Must be OUTERMOST
@api_view(['POST'])
def get_audio(request):

    lesson_id = request.data.get('lesson_id')
    current_lesson_index = int(request.data.get('current_lesson_index', 0))
    full_audio = request.data.get('full_audio')
    print(full_audio)
    
    

    if full_audio:
        try:
            lesson = Lesson.objects.get(id=lesson_id)

            print(f"A single audio file has been requested for {lesson_id}")

            audio_folder = lesson.audio_folder

            print("Audio folder:", audio_folder)

            audio_path = os.path.join(
                os.path.dirname(audio_folder),
                "audio.mp3"
            )

            print("FULL AUDIO PATH:", audio_path)
            print("FILE EXISTS:", os.path.exists(audio_path))

            response = FileResponse(open(audio_path, 'rb'), content_type='audio/mp4')
            response["Content-Length"] = os.path.getsize(audio_path)
            response["Accept-Ranges"] = "bytes"
            return response

        except Lesson.DoesNotExist:
            return Response({'error': 'Lesson not found'}, status=404)
        except ValueError:
            return Response({'error': 'Invalid index format'}, status=400)
        except Exception as e:
            print("Audio error:", str(e))
            return Response({'error': 'Server error while fetching audio'}, status=500)

    else:

        try:
            

            lesson = Lesson.objects.get(id=lesson_id)
            if not lesson.audio_folder:
                return Response({'error': 'Audio folder not set for this lesson'}, status=404)

            # Construct absolute path
            audio_folder = os.path.join(settings.BASE_DIR, 'api', lesson.audio_folder)
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
            lesson.audio_folder
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

    recording_id = str(uuid.uuid4())

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
def stop_record(request):
    recording_id = request.data["recording_id"]

    process = RECORDINGS.get(recording_id)

    if process:
        try:
            process.stdin.write(b"q")
            process.stdin.flush()
            process.wait(timeout=15)
        except Exception:
            process.terminate()

        del RECORDINGS[recording_id]

    file_url = f"https://localhost/media/records/{recording_id}.mp4"

    return Response({
        "file_url": file_url
    })




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

    result = []

    for word_text in words:

        frequency = 0.0
        has_translation = False
        is_saved = False

        word_obj = Word.objects.filter(
            word__iexact=word_text,
            language=sentence.lesson_language
        ).first()

        if word_obj:

            has_translation = WordTranslation.objects.filter(
                word=word_obj,
                native_language=sentence.translate_language,
                target_language=sentence.lesson_language
            ).exists()

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
    print("Semtence Data:", result)

    return Response(result)