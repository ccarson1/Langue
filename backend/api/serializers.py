# serializers.py
from rest_framework import serializers
from .models import User, Language, Word, WordTranslation, UserSetting, Profile
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
            creation_date=timezone.now()
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
    class Meta:
        model = User
        fields = ['id', 'username', 'email']
        
class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = ['id', 'lang_name']

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