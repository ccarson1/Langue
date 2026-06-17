import pytesseract
from PIL import Image


class OCR():
    def __init__(self, image_file):
        self.image = Image.open(image_file)

    def pytesseract(self):
        pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        text = pytesseract.image_to_string(self.image, lang="lit")
        return text