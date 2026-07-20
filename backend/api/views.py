# backend/api/views.py

from pathlib import Path
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
from .models import User, Language, UserSetting, Word, WordTranslation, Lesson, UserLessonsProgress, Profile, Sentence, UserWord, Channel, Recording
from django.db.models import Q
from .serializers import UserSerializer, SignupSerializer, LanguageSerializer, LessonSerializer, UserLessonsProgressSerializer, RecordingSerializer
from django.views.generic import TemplateView
from .w_translate import translate_word

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

            print(lesson_file)

            nativeLang = get_object_or_404( Language, lang_name=nativeLangName )
            targetLang = get_object_or_404( Language, lang_name=targetLangName )

            user_id = request.user.id
            lesson_import_progress[user_id] = 0

            lessonEmpty = request.data.get('lessonEmpty')
            alwaysGenerateCaptions = request.data.get('alwaysGenerateCaptions')

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
                    user_id,
                    alwaysGenerateCaptions,
                    videoFormat,
                    translateTarget
                )

                success = save_lesson_media.process_lesson()
                if not success:
                    raise Exception(
                        "YouTube processing failed"
                    )

                lesson.media_folder = (
                    save_lesson_media.AUDIO_DIR
                )

                lesson.save()

            # FILE IMPORT
            if (fileUploaded or alwaysGenerateCaptions) and (audioUploaded or videoFormat) and urlReference == False:

                if lesson_file:
                    lesson.doc_file = lesson_file

                if media_file:
                    lesson.media_file = media_file
                    

                lesson.save()
                save_lesson_media = VTT( 
                    lesson_file, lesson.id, 
                    lesson.target_language.id, 
                    lesson.native_language.id, 
                    lesson_import_progress, 
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

                lesson.media_folder = (
                    save_lesson_media.AUDIO_DIR
                )

                lesson.media_folder = ( save_lesson_media.AUDIO_DIR )
                lesson.save()
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
    lessons = Lesson.objects.filter(target_language_id=target_lang_id, user=user)
    serializer = LessonSerializer(lessons, many=True, context={'request': request})
    print(serializer.data)
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

        if 'image' in request.FILES:
            lesson.image = request.FILES['image']

        if 'media_file' in request.FILES:
            lesson.media_file = request.FILES['audio_file']

        

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
                Sentence.objects.create(
                    lesson=lesson,
                    sentence=s.get('sentence', ''),
                    start_ms=s.get('start_ms', 0),
                    end_ms=s.get('end_ms', 0),
                    translated_sentence=s.get('translated_sentence', ''),
                    lesson_language_id=lesson.target_language_id,
                    translate_language_id=lesson.native_language_id,
                )

        #lesson.save()
        print("Native Language:", lesson.native_language)
        print("Target Language:", lesson.target_language )

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
                'showVideoCaptions': settings.showVideoCaptions,
                'showVideoView': settings.showVideoView,
                'continuousPlay': settings.continuousPlay,
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
        showVideoCaptions = request.data.get('showVideoCaptions')
        showVideoView = request.data.get('showVideoView')
        continuousPlay = request.data.get('continuousPlay')

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
            settings.showVideoCaptions = showVideoCaptions if showVideoCaptions is not None else settings.showVideoCaptions
            settings.showVideoView = showVideoView if showVideoView is not None else settings.showVideoView
            settings.continuousPlay = continuousPlay if continuousPlay is not None else settings.continuousPlay
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
                    "end_ms": s.end_ms
                }
                for s in sentences
            ],
            'videoFormat' : lesson.videoFormat
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

    recording = Recording.objects.create(
        user=request.user,
        record_name=recording_id,
        record_file=relative_path,
        record_img=f"/media/images/record_thumbnails/{recording_id}.jpg",
        record_folder="records",
        record_channel=Channel.objects.get(pk=request.data["channel_id"]),
        native_language = Language.objects.get(lang_name=language_name),
        record_private=False,
    )

    file_url = request.build_absolute_uri(recording.record_file.url)

    return Response({
        "id": recording.id,
        "file_url": file_url,
    })

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_recording(request, recording_id):
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

    recording.delete()

    return Response(
        {"success": True},
        status=status.HTTP_200_OK
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recordings(request):
    recordings = (
        Recording.objects
        .filter(user=request.user)
        .order_by("-created_at")
    )

    serializer = RecordingSerializer(
        recordings,
        many=True,
        context={"request": request}
    )

    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recording_detail(request, recording_id):   # ← changed from pk to recording_id
    try:
        recording = Recording.objects.get(id=recording_id, user=request.user)
        
        data = {
            "id": recording.id,
            "title": getattr(recording, 'record_name', None) or f"Recording {recording.id}",
            "record_file": recording.record_file.url if getattr(recording, 'record_file', None) else None,
            "record_img": getattr(recording, 'record_img', None),
            "created_at": recording.created_at.isoformat() if hasattr(recording, 'created_at') else None,
        }
        
        return Response(data)
        
    except Recording.DoesNotExist:
        return Response({"error": "Recording not found"}, status=404)
    except Exception as e:
        print("Recording detail error:", str(e))
        return Response({"error": str(e)}, status=500)



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

        print("WORD:", word_text)
        print("LESSON LANGUAGE:", sentence.lesson_language)

        frequency = 0.0
        has_translation = False
        is_saved = False

        word_obj = Word.objects.filter(
            word__iexact=word_text,
            language=sentence.lesson_language
        ).first()

        print("WORD OBJ:", word_obj)

        if word_obj:

            has_translation = WordTranslation.objects.filter(
                word=word_obj,
                native_language=sentence.translate_language,
                target_language=sentence.lesson_language
            ).exists()

            print("HAS TRANSLATION:", has_translation)

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

@csrf_exempt
@permission_classes([IsAuthenticated])
def ocr_image(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=400)

    image_file = request.FILES.get("image")
    translateText = request.POST.get("translateText")
    generateAudio = request.POST.get("generateAudio")
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
        print("lang_code:", lang_code)
    except UserSetting.DoesNotExist:
        lang_code = "eng"  # fallback

    # --- Run OCR ---
    ocr = OCR(image_file, lang_code)
    text = ocr.pytesseract()

    if translateText:
        translated_text = translate_word(text, src_lang=settings.target_language.yt_dlp_lang, tgt_lang=settings.native_language.yt_dlp_lang)
    else:
        translated_text = ''

    return JsonResponse({"text": text, "translation": translated_text})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def alphabet(request):

    user_settings = UserSetting.objects.select_related(
        'target_language'
    ).get(user=request.user)

    lang_code = user_settings.target_language.yt_dlp_lang

    alphabet_dir = (
        Path(settings.BASE_DIR)
        / 'api'
        / 'alphabets'
        / f'{lang_code}_alphabet'
    )

    json_file = alphabet_dir / f'{lang_code}_alphabet.json'

    print("BASE_DIR:", settings.BASE_DIR)
    print("alphabet_dir:", alphabet_dir)
    print("json_file:", json_file)
    print("exists:", json_file.exists())

    if not json_file.exists():
        return JsonResponse(
            {
                'error': f'Alphabet not found for language {lang_code}'
            },
            status=404
        )

    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    audio_base_url = request.build_absolute_uri(
        '/api/alphabets/audio/'
    )

    for item in data.get('alphabet', []):
        filename = item['audio']

        # ensure extension only added once
        if not filename.endswith('.mp3'):
            filename = f"{filename}.mp3"

        item['audio'] = request.build_absolute_uri(
            f"/api/alphabets/audio/{lang_code}/{filename}"
        )

    return JsonResponse(data)


def alphabet_audio(request, lang_code, filename):
    audio_file = (
        Path(settings.BASE_DIR)
        / 'api'
        / 'alphabets'
        / f'{lang_code}_alphabet'
        / filename
    )

    print(audio_file)

    if not audio_file.exists():
        raise Http404("Audio file not found")

    response = FileResponse(open(audio_file, 'rb'), content_type='audio/mpeg')

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
    

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def channels(request):

    settings = UserSetting.objects.get(user=request.user)

    print("User:", request.user)
    print("Settings:", settings)
    print("Native:", settings.target_language_id)

    channels = Channel.objects.filter(
        native_language_id=settings.target_language_id,
        channel_private=False
    ) & Channel.objects.filter(
        user=request.user
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
            "owner": c.user.username,
            "private": c.channel_private,
            "is_favorite": c.is_favorite,
            "target_language": settings.target_language_id,
            "native_language": settings.target_language_id
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
        user=request.user
    )

    return FileResponse(
        lesson.media_file.open("rb"),
        content_type="video/mp4"
    )

