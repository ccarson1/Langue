import pytesseract
from PIL import Image


class OCR():
    def __init__(self, image_file, lang_code):
        self.image = Image.open(image_file)
        self.lang_code = lang_code

    def pytesseract(self):
        pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        text = pytesseract.image_to_string(self.image, lang=self.lang_code)
        return text