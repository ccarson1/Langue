import os
import shutil

from django.core.management.base import BaseCommand

from api.models import AIModel


class Command(BaseCommand):
    help = "Scan the models directory and add/update AI models."

    MODEL_CONFIG = {
        "m2m100": {
            "name": "M2M100",
            "purpose": "text_to_text",
            "model_type": "m2m100",
            "model_name": "facebook/m2m100_418M",
            "source_language": None,
            "target_language": None,
        },

        "opus": {
            "name": "OPUS",
            "purpose": "text_to_text",
            "model_type": "opus",
            "model_name": "Helsinki-NLP/opus-mt-tc-big-lt-en",
            "source_language": "lt",
            "target_language": "en",
        },

        "paddleocr": {
            "name": "PaddleOCR",
            "purpose": "image_to_text",
            "model_type": "paddleocr",
            "model_name": "PaddleOCR",
            "source_language": None,
            "target_language": None,
        },
    }

    TESSERACT_CONFIG = {
        "name": "Tesseract",
        "purpose": "image_to_text",
        "model_type": "tesseract",
        "model_name": "Tesseract OCR",
        "source_language": None,
        "target_language": None,
    }

    def find_tesseract(self):

        # Check PATH first
        tesseract_path = shutil.which("tesseract")

        if tesseract_path:
            return tesseract_path

        # Common Windows installation locations
        if os.name == "nt":

            possible_paths = [
                os.path.join(
                    os.environ.get("ProgramFiles", ""),
                    "Tesseract-OCR",
                    "tesseract.exe",
                ),
                os.path.join(
                    os.environ.get("ProgramFiles(x86)", ""),
                    "Tesseract-OCR",
                    "tesseract.exe",
                ),
            ]

            for path in possible_paths:

                if os.path.isfile(path):
                    return path

        return None

    def handle(self, *args, **options):

        base_dir = os.path.dirname(
            os.path.dirname(
                os.path.dirname(
                    os.path.dirname(
                        os.path.abspath(__file__)
                    )
                )
            )
        )

        models_dir = os.path.join(
            base_dir,
            "models"
        )

        self.stdout.write("")
        self.stdout.write("=" * 40)
        self.stdout.write(" Langue - Model Scanner")
        self.stdout.write("=" * 40)
        self.stdout.write("")

        if not os.path.isdir(models_dir):

            self.stdout.write(
                self.style.ERROR(
                    f"Models directory not found: {models_dir}"
                )
            )

            return

        self.stdout.write(
            f"Scanning: {models_dir}"
        )

        self.stdout.write("")

        found_models = 0
        added_models = 0
        updated_models = 0

        # ----------------------------------------
        # Check Tesseract
        # ----------------------------------------

        tesseract_path = self.find_tesseract()

        config = self.TESSERACT_CONFIG

        model, created = AIModel.objects.update_or_create(
            model_type=config["model_type"],
            defaults={
                "name": config["name"],
                "purpose": config["purpose"],
                "model_name": config["model_name"],
                "save_path": tesseract_path,
                "source_language": config["source_language"],
                "target_language": config["target_language"],
                "is_active": bool(tesseract_path),
            }
        )

        if created:

            added_models += 1

            self.stdout.write(
                self.style.SUCCESS(
                    "Added: Tesseract"
                )
            )

        else:

            updated_models += 1

            self.stdout.write(
                "Updated: Tesseract"
            )

        self.stdout.write(
            f"  Purpose: {config['purpose']}"
        )

        self.stdout.write(
            f"  Type: {config['model_type']}"
        )

        self.stdout.write(
            f"  Path: {tesseract_path}"
        )

        self.stdout.write(
            f"  Active: {bool(tesseract_path)}"
        )

        self.stdout.write("")

        # ----------------------------------------
        # Scan model directory
        # ----------------------------------------

        for folder_name in sorted(
            os.listdir(models_dir)
        ):

            folder_path = os.path.join(
                models_dir,
                folder_name
            )

            if not os.path.isdir(folder_path):
                continue

            if folder_name not in self.MODEL_CONFIG:

                self.stdout.write(
                    self.style.WARNING(
                        f"Skipping unknown model: {folder_name}"
                    )
                )

                continue

            found_models += 1

            config = self.MODEL_CONFIG[folder_name]

            save_path = os.path.join(
                ".",
                "models",
                folder_name
            ).replace("\\", "/")

            model, created = AIModel.objects.update_or_create(
                model_type=config["model_type"],
                defaults={
                    "name": config["name"],
                    "purpose": config["purpose"],
                    "model_name": config["model_name"],
                    "save_path": save_path,
                    "source_language": config["source_language"],
                    "target_language": config["target_language"],
                    "is_active": True,
                }
            )

            if created:

                added_models += 1

                self.stdout.write(
                    self.style.SUCCESS(
                        f"Added: {config['name']}"
                    )
                )

            else:

                updated_models += 1

                self.stdout.write(
                    f"Updated: {config['name']}"
                )

            self.stdout.write(
                f"  Purpose: {config['purpose']}"
            )

            self.stdout.write(
                f"  Type: {config['model_type']}"
            )

            self.stdout.write(
                f"  Path: {save_path}"
            )

            self.stdout.write("")

        self.stdout.write("=" * 40)
        self.stdout.write(" Scan complete")
        self.stdout.write("=" * 40)
        self.stdout.write(
            f"Models found: {found_models}"
        )
        self.stdout.write(
            f"Models added: {added_models}"
        )
        self.stdout.write(
            f"Models updated: {updated_models}"
        )
        self.stdout.write("")