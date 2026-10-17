# import os

# os.environ["PADDLE_PDX_CACHE_HOME"] = os.path.abspath(
#     "backend/models/paddleocr"
# )

# from paddleocr import PaddleOCR

# IMAGE_PATH = r"20260525_123916.jpg"

# ocr = PaddleOCR(lang="lt")

# result = ocr.predict(IMAGE_PATH)

# for page in result:
#     print(page)



import os

os.environ["PADDLE_PDX_CACHE_HOME"] = os.path.abspath(
    "backend/models/paddleocr"
)

from paddleocr import PaddleOCR


IMAGE_PATH = r"20260525_123916.jpg"


# --------------------------------------------------
# Current Lithuanian model
# --------------------------------------------------

print()
print("=" * 60)
print("CURRENT MODEL")
print("=" * 60)

ocr = PaddleOCR(
    lang="lt"
)

result = ocr.predict(IMAGE_PATH)

for page in result:

    print(page["rec_texts"])


# --------------------------------------------------
# Latin PP-OCRv5 model
# --------------------------------------------------

print()
print("=" * 60)
print("LATIN PP-OCRv5 MODEL")
print("=" * 60)

ocr = PaddleOCR(
    text_recognition_model_name="latin_PP-OCRv5_mobile_rec"
)

result = ocr.predict(IMAGE_PATH)

for page in result:

    print(page["rec_texts"])