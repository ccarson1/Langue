# backend/api/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.hashers import check_password
from .models import User, Language, Word, WordTranslation
from .serializers import UserSerializer, SignupSerializer
from django.views.generic import TemplateView

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


@api_view(['POST'])
def api_signup(request):
    serializer = SignupSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({'message': 'Account created successfully!'}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def translate(request):
    text = request.data.get('text', '').strip().lower()
    nat_id = request.data.get('native_id')
    tar_id = request.data.get('target_id')

    if not text or not nat_id or not tar_id:
        return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)

    word = Word.objects.filter(word=text, language_id=nat_id).first()

    if word:
        word_translation = WordTranslation.objects.filter(word_id=word.id, nat_id=nat_id, tar_id=tar_id).first()
        if word_translation:
            return Response({'translated': word_translation.definition, 'inDatabase': 1})

    # Replace with your translation function:
    translated_text = tr.translate(text)

    return Response({'translated': translated_text, 'inDatabase': 0})


@api_view(['POST'])
def save_word(request):
    required_fields = ['word', 'nat_id', 'tar_id', 'user_id', 'definition']
    if not all(field in request.data for field in required_fields):
        return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)

    word_text = request.data['word'].strip()
    nat_id = request.data['nat_id']
    tar_id = request.data['tar_id']
    user_id = request.data['user_id']
    definition = request.data['definition'].strip()

    try:
        user = User.objects.get(id=user_id)
        nat_lang = Language.objects.get(id=nat_id)
        tar_lang = Language.objects.get(id=tar_id)
    except (User.DoesNotExist, Language.DoesNotExist):
        return Response({'error': 'User or language not found'}, status=status.HTTP_404_NOT_FOUND)

    word, created = Word.objects.get_or_create(word=word_text, language=nat_lang)

    word_translation = WordTranslation.objects.create(
        nat_id=nat_lang.id,
        tar_id=tar_lang.id,
        user_id=user.id,
        word_id=word.id,
        definition=definition
    )

    return Response({
        'message': 'Word and translation saved',
        'word_id': word.id,
        'translation_id': word_translation.id
    }, status=status.HTTP_201_CREATED)

class FrontendAppView(TemplateView):
    template_name = 'index.html'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def hello_user(request):
    return Response({"message": f"Hello, {request.user.username}!"})
