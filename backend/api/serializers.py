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

    print(User.objects.filter(email="jdoe@gmail.com"))
    print(User.objects.filter(username="jdoe"))

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

        user = User(
            username=validated_data['username'],
            email=validated_data['email'],

            password=make_password(validated_data['password']),
        )
        user.save()
        return user