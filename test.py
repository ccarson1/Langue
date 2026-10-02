from paddleocr import PaddleOCR

IMAGE_PATH = r"20260525_123916.jpg"

ocr = PaddleOCR(lang="lt")

result = ocr.predict(IMAGE_PATH)

for page in result:
    print(page)
