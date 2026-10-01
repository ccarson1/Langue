import pytesseract
import re

from PIL import Image
from io import BytesIO

from api.models import Sentence, Lesson, Language
from .w_translate import load_user_model, translate_word
from .utils.storage import StorageManager

import fitz


class OCR():

    def __init__(self, image_file, lang_code, native_lang_code):
        self.pytesseract_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        pytesseract.pytesseract.tesseract_cmd = self.pytesseract_path

        self.image = Image.open(image_file) if image_file else None
        self.lang_code = lang_code
        self.native_lang_code = native_lang_code


        print("Language of the image:", lang_code)
        print("Language of the user:", native_lang_code)


    def pytesseract(self):

        text = pytesseract.image_to_string(
            self.image,
            lang=self.lang_code
        )

        text = re.sub(r'\s+', ' ', text).strip()

        return text

    def pdf_to_text(self, pdf_file, user_id, lesson_import_progress):
        pdf_file.seek(0)

        pdf_bytes = pdf_file.read()
        pdf = fitz.open(stream=pdf_bytes, filetype="pdf")

        all_text = []

        for page_number, page in enumerate(pdf):
            print(f"Processing PDF page {page_number + 1}/{len(pdf)}")

            progress = 5 + int(
                ((page_number + 1) / len(pdf)) * 45
            )

            lesson_import_progress[user_id] = progress

            pix = page.get_pixmap(
                matrix=fitz.Matrix(2, 2),
                alpha=False
            )

            image = Image.open(
                BytesIO(pix.tobytes("png"))
            )

            text = pytesseract.image_to_string(
                image,
                lang=self.lang_code
            )

            text = re.sub(r'\s+', ' ', text).strip()

            if text:
                all_text.append(text)

        pdf.close()

        return "\n".join(all_text)


    def text_to_sentences(self, text):
        text = re.sub(r'\s+', ' ', text).strip()

        if not text:
            return []

        sentences = re.split(
            r'(?<=[.!?])\s+',
            text
        )

        return [
            sentence.strip()
            for sentence in sentences
            if sentence.strip()
        ]


    def create_sentences(
        self,
        sentences,
        lesson,
        native_id,
        target_id,
        translateTarget,
        user_id,
        lesson_import_progress
    ):
        total_sentence_storage = 0

        if not sentences:
            return 0

        if translateTarget:
            load_user_model(user_id)

        for position, text in enumerate(sentences):
            print(f"Processing PDF page {position + 1}/{len(sentences)}")

            if translateTarget:
                translated = translate_word(
                    text,
                    lesson.target_language.yt_dlp_lang,
                    lesson.native_language.yt_dlp_lang
                )
            else:
                translated = ""

            progress = 50 + int(
                ((position + 1) / len(sentences)) * 45
            )

            lesson_import_progress[user_id] = progress

            Sentence.objects.create(
                sentence=text,
                start_ms=0,
                end_ms=0,
                translated_sentence=translated,
                position=position,
                lesson_language=native_id,
                translate_language=target_id,
                lesson=lesson
            )

            total_sentence_storage += (
                len((text or "").encode("utf-8")) +
                len((translated or "").encode("utf-8"))
            )

        return total_sentence_storage

    def process_pdf(
        self,
        pdf_file,
        lesson,
        native_id,
        target_id,
        translateTarget,
        user_id,
        lesson_import_progress
    ):
        print("Processing PDF...")

        # Get text from every PDF page
        text = self.pdf_to_text(
            pdf_file,
            user_id,
            lesson_import_progress
        )

        # Convert text into sentences
        sentences = self.text_to_sentences(text)

        print(f"Found {len(sentences)} sentences.")

        # Save sentences
        total_storage = self.create_sentences(
            sentences,
            lesson,
            native_id,
            target_id,
            translateTarget,
            user_id,
            lesson_import_progress
        )

        StorageManager.recalculate_sentence_storage(lesson.user)

        return total_storage