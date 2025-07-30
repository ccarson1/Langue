
from django.urls import path
from . import views
from django.urls import path, re_path
from .views import FrontendAppView
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    path('login/', views.api_login, name='api_login'),
    path('signup/', views.api_signup, name='api_signup'),
    path('translate/', views.translate, name='translate'),
    path('save_word/', views.save_word, name='save_word'),
    re_path(r'^.*$', FrontendAppView.as_view(), name='frontend'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)