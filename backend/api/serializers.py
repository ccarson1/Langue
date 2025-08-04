# serializers.py
from rest_framework import serializers
from .models import User, Language, Word, WordTranslation, UserSetting, Profile, Lesson, UserLessonsProgress
from django.contrib.auth.hashers import make_password
from django.utils import timezone 



class SignupSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=60)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    native_language = serializers.PrimaryKeyRelatedField(queryset=Language.objects.all())
    target_language = serializers.PrimaryKeyRelatedField(queryset=Language.objects.all())

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'Passwords do not match.'
            })

        if User.objects.filter(username=data['username']).exists():
            raise serializers.ValidationError({
                'username': 'Username is already taken.'
            })

        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({
                'email': 'Email is already registered.'
            })

        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        
        native_lang = validated_data.pop('native_language')
        target_lang = validated_data.pop('target_language')

        # Create User
        user = User(
            username=validated_data['username'],
            email=validated_data['email'],
            password=make_password(validated_data['password']),
        )
        user.save()

        # Optionally pick default language (assumes Language with pk=1 exists)
        default_language = Language.objects.first()  # or get(id=1), etc.

        # Create Profile
        Profile.objects.create(
            user=user,
            native_language=native_lang,
            creation_date=timezone.now(),
            languages=[target_lang.id]
        )

        # Create UserSetting
        UserSetting.objects.create(
            user=user,
            native_language=native_lang,
            target_language=target_lang,
            notifications=True
        )

        return user
    


class UserSerializer(serializers.ModelSerializer):
    current_lesson = serializers.SerializerMethodField()
    current_lesson_index = serializers.IntegerField(source='profile.current_lesson.current_lesson_index', required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'current_lesson', 'current_lesson_index']

    def get_current_lesson(self, obj):
        if hasattr(obj, 'profile') and obj.profile.current_lesson:
            return obj.profile.current_lesson.lesson_id.id if obj.profile.current_lesson.lesson_id else None
        return None

class UserLessonsProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserLessonsProgress
        fields = ['id', 'user', 'lesson_id', 'current_lesson_index', 'last_viewed']
        
class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = ['id', 'lang_name']

class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = [
            'id',
            'user', 
            'native_language', 
            'target_language', 
            'lesson_private',
            'created_at',
            'title']

# class SignupSerializer(serializers.Serializer):
#     username = serializers.CharField(max_length=60)
#     email = serializers.EmailField()
#     password = serializers.CharField(write_only=True)
#     confirm_password = serializers.CharField(write_only=True)



#     def validate(self, data):
#         if data['password'] != data['confirm_password']:
#             raise serializers.ValidationError({
#                 'confirm_password': 'Passwords do not match.'
#             })

#         if User.objects.filter(username=data['username']).exists():
#             raise serializers.ValidationError({
#                 'username': 'Username is already taken.'
#             })

#         if User.objects.filter(email=data['email']).exists():
#             raise serializers.ValidationError({
#                 'email': 'Email is already registered.'
#             })

#         return data

#     def create(self, validated_data):
#         validated_data.pop('confirm_password')

#         user = User(
#             username=validated_data['username'],
#             email=validated_data['email'],

#             password=make_password(validated_data['password']),
#         )
#         user.save()
#         return user