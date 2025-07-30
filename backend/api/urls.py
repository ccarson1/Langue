
from django.urls import path
from . import views
from django.urls import path, re_path
from .views import FrontendAppView
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView



urlpatterns = [
    path('login/', views.api_login, name='api_login'),
    path('signup/', views.api_signup, name='api_signup'),
    path('translate/', views.translate, name='translate'),
    path('save_word/', views.save_word, name='save_word'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('hello/', views.hello_user),
    re_path(r'^.*$', FrontendAppView.as_view(), name='frontend'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)