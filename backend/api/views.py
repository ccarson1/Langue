# backend/api/views.py
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, parser_classes
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.hashers import make_password
from django.contrib.auth.hashers import check_password
from .models import User, Language, UserSetting, Word, WordTranslation, Lesson, UserLessonsProgress, Profile, Sentence
from .serializers import UserSerializer, SignupSerializer, LanguageSerializer, LessonSerializer, UserLessonsProgressSerializer
from django.views.generic import TemplateView
from .w_translate import translate_word

from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from rest_framework.parsers import MultiPartParser, FormParser
import os
from django.conf import settings
from .vtt import VTT
from django.utils import timezone


@api_view(['POST'])
def api_login(request):
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response({"error": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "Invalid email or password."}, status=status.HTTP_401_UNAUTHORIZED)

    if not check_password(password, user.password):
        return Response({"error": "Invalid email or password."}, status=status.HTTP_401_UNAUTHORIZED)

    return Response({
        "message": "Login successful",
        "user": UserSerializer(user).data
    })

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
    nat_id = request.data.get('native_id')
    tar_id = request.data.get('target_id')

    print(f"Text: {text}")
    print(f"Native: {nat_id}")
    print(f"Target: {tar_id}")

    if not text or not nat_id or not tar_id:
        return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)

    word = Word.objects.filter(word=text, language_id=tar_id).first()

    if word:
        word_translation = WordTranslation.objects.filter(
            word_id=word.id,
            native_language_id=nat_id,
            target_language_id=tar_id
        ).first()
        if word_translation:
            return Response({'translated': word_translation.definition, 'inDatabase': 1})

    # Replace with your translation function:
    translated_text = translate_word(text)

    return Response({'translated': translated_text, 'inDatabase': 0})

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def import_lesson(request):
    print("=== RAW DATA ===")
    print(request.data)
    print("=== FILES ===")
    print(request.FILES)

    url = request.data.get('url')
    title = request.data.get('title')
    nativeLang = request.data.get('nativeLanguage')
    targetLang = request.data.get('targetLanguage')
    audioUploaded = request.data.get('audioUploaded')
    lessonPrivate = request.data.get('lessonPrivate', 'false').lower() in ['true', '1', 'yes']
    fileUploaded = request.data.get('fileUploaded', 'false').lower() in ['true', '1', 'yes']
    urlReference = request.data.get('urlReference', 'false').lower() in ['true', '1', 'yes']

    lesson_file = request.FILES.get('file')
    audio_file = request.FILES.get('audio')

    # Create and save Lesson object
    lesson = Lesson(
        user=request.user,
        url=url,
        native_language=nativeLang,
        target_language=targetLang,
        lesson_private=lessonPrivate,
        urlReference = urlReference,
        title = title
    )
    
    

    if fileUploaded and lesson_file:
        lesson.doc_file = lesson_file

    if audioUploaded and audio_file:
        lesson.audio_file = audio_file
        
    if urlReference:
        print(f"Processing the video url: {url}")

    lesson.save()
    
    if urlReference:
        save_lesson_media = VTT(lesson.url, lesson.id, lesson.target_language, lesson.native_language)
        save_lesson_media.process_lesson()


    return Response({
        'message': 'Lesson uploaded successfully.',
        'lessonId': lesson.id,
        'url': lesson.url,
        'nativeLang': lesson.native_language,
        'targetLang': lesson.target_language,
        'hasDoc': bool(lesson.doc_file),
        'hasAudio': bool(lesson.audio_file)
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def get_lessons(request):
    lessons = Lesson.objects.all()
    serializer = LessonSerializer(lessons, many=True)
    return Response(serializer.data)


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
    nat_id = request.data['nat_id']
    tar_id = request.data['tar_id']
    user_id = user.id
    definition = request.data['definition'].strip()

    try:
        user = User.objects.get(id=user_id)
        nat_lang = Language.objects.get(id=nat_id)
        tar_lang = Language.objects.get(id=tar_id)
    except (User.DoesNotExist, Language.DoesNotExist):
        return Response({'error': 'User or language not found'}, status=status.HTTP_404_NOT_FOUND)

    word, created = Word.objects.get_or_create(word=word_text, language=tar_lang)

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
                # add more fields as needed
            }
            return Response(data)

        except UserSetting.DoesNotExist:
            return Response({'error': 'Settings not found'}, status=404)

    elif request.method == 'PUT':
        native_id = request.data.get('native_language')
        target_id = request.data.get('target_language')
        notifications = request.data.get('notifications')

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
            settings.save()

            return Response({'message': 'Settings updated successfully'})
        except Language.DoesNotExist:
            return Response({'error': 'Invalid language ID'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
@permission_classes([IsAuthenticated])
def user_lessons_progress_view(request):
    user = request.user

    if request.method == 'POST':
        lesson_id = request.data.get('lesson_id')
        current_index = request.data.get('current_lesson_index')

        if not lesson_id or current_index is None:
            return Response({"error": "lesson_id and current_lesson_index are required"}, status=400)

        try:
            lesson = Lesson.objects.get(id=lesson_id)
        except Lesson.DoesNotExist:
            return Response({"error": "Lesson not found"}, status=404)

        # Create or update the progress
        progress, created = UserLessonsProgress.objects.update_or_create(
            user=user,
            lesson_id=lesson,
            defaults={
                "current_lesson_index": current_index,
                "last_viewed": timezone.now(),
            }
        )

        data = {
            "lesson_id": progress.lesson_id.id if progress.lesson_id else None,
            "current_lesson_index": progress.current_lesson_index,
            "last_viewed": progress.last_viewed.isoformat() if progress.last_viewed else None,
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
                progress = UserLessonsProgress.objects.get(user=user, lesson_id=lesson_id_int)
                data = {
                    "lesson_id": progress.lesson_id.id if progress.lesson_id else None,
                    "current_lesson_index": progress.current_lesson_index,
                    "last_viewed": progress.last_viewed.isoformat() if progress.last_viewed else None,
                }
                return Response(data)
            except UserLessonsProgress.DoesNotExist:
                return Response({"error": "Progress not found"}, status=404)
            
@api_view(['GET'])
def lesson_detail_with_sentences(request, lesson_id):
    try:
        lesson = Lesson.objects.get(id=lesson_id)
        sentences = Sentence.objects.filter(lesson_id=lesson)

        lesson_data = {
            "id": lesson.id,
            "title": lesson.title,
            "doc_file": lesson.doc_file.url if lesson.doc_file else None,
            "audio_file": lesson.audio_file.url if lesson.audio_file else None,
            "native_language": lesson.native_language,
            "target_language": lesson.target_language,
            "sentences": [
                {
                    "id": s.id,
                    "audio_file": s.audio_file,
                    "sentence": s.sentence,
                    "translated_sentence": s.translated_sentence
                }
                for s in sentences
            ]
        }

        return Response(lesson_data, status=status.HTTP_200_OK)

    except Lesson.DoesNotExist:
        return Response({'error': 'Lesson not found'}, status=status.HTTP_404_NOT_FOUND)