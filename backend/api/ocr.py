import pytesseract
from PIL import Image
import re


class OCR():
    def __init__(self, image_file, lang_code):
        self.image = Image.open(image_file)
        self.lang_code = lang_code
        print(lang_code)

    def pytesseract(self):
        pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        text = pytesseract.image_to_string(self.image, lang=self.lang_code)

        # 1) normalize to lowercase
        text = text.lower()

        # 2) split into sentences (keeps punctuation)
        sentences = re.split(r'([.!?]\s*)', text)

        # 3) rebuild with capitalized sentence starts
        result = ""
        for i in range(0, len(sentences), 2):
            sentence = sentences[i].strip()
            punctuation = sentences[i+1] if i+1 < len(sentences) else ""

            if sentence:
                sentence = sentence[0].upper() + sentence[1:]

            result += sentence + punctuation

            print(result)

        text = result.strip()
        
        return text