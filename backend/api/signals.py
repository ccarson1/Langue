from django.core.mail import send_mail
from django_rest_passwordreset.signals import reset_password_token_created
from django.dispatch import receiver

@receiver(reset_password_token_created)
def password_reset_token_created(sender, instance, reset_password_token, *args, **kwargs):
    email_plaintext_message = f"Use this token to reset your password: {reset_password_token.key}"

    send_mail(
        # title:
        "Password Reset for Your Account",
        # message:
        email_plaintext_message,
        # from:
        "no-reply@example.com",
        # to:
        [reset_password_token.user.email]
    )
