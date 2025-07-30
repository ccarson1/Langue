# serializers.py
from rest_framework import serializers
from .models import User, Language, Word, WordTranslation
from django.contrib.auth.hashers import make_password

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class SignupSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=60)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match")
        if User.objects.filter(username=data['username']).exists() or User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError("Username or email already taken")
        return data

    def create(self, validated_data):
        default_language = Language.objects.filter(lang_name='English').first()
        user = User(
            username=validated_data['username'],
            email=validated_data['email'],
            native_language=default_language,
            password=make_password(validated_data['password']),
        )
        user.save()
        return user
