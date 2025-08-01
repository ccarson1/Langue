# backend/api/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.hashers import check_password
from .models import User, Language, Word, WordTranslation
from .serializers import UserSerializer, SignupSerializer
from django.views.generic import TemplateView
from .w_translate import translate_word
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.authentication import TokenAuthentication


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
@authentication_classes([TokenAuthentication])
def import_lesson(request):
    
    url = request.data.get('url')
    nativeLang = request.data.get('nativeLang')
    targetLang = request.data.get('targetLang')

    return Response({'url': url, 'nativeLang': nativeLang, 'targetLang': targetLang,})

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


    @csrf_exempt
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)




