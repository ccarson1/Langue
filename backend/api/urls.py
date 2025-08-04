

from . import views
from django.urls import path, re_path, include
from .views import FrontendAppView, UserProfileView
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('login/', views.api_login, name='api_login'),
    path('signup/', views.api_signup, name='api_signup'),
    path('translate/', views.translate, name='translate'),
    path('save_word/', views.save_word, name='save_word'),
    path('import-lesson/', views.import_lesson, name='import_lesson'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('csrf/', views.get_csrf),
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('password_reset/', include('django_rest_passwordreset.urls', namespace='password_reset')),
    path('languages/', views.get_languages, name='get_languages'),
    path('lessons/', views.get_lessons, name='get_lessons'),
    path('settings/', views.user_settings, name='user_settings'),
    path('account/', views.account, name='account'),
    path('user-progress/', views.user_lessons_progress_view, name='user_lessons_progress'),
    re_path(r'^.*$', FrontendAppView.as_view(), name='frontend'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)