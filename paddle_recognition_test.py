import os

os.environ["PADDLE_PDX_CACHE_HOME"] = os.path.abspath(
    "backend/models/paddleocr"
)

from paddleocr import PaddleOCR, TextRecognition

from PIL import Image

import numpy as np

import pytesseract


IMAGE_PATH = r"20260525_123916.jpg"


# --------------------------------------------------
# Load image
# --------------------------------------------------

image = Image.open(
    IMAGE_PATH
).convert("RGB")

image_array = np.array(
    image
)


# --------------------------------------------------
# Detect text regions
# --------------------------------------------------

print()
print("=" * 60)
print("DETECTING TEXT")
print("=" * 60)

ocr = PaddleOCR(
    lang="lt"
)

result = ocr.predict(
    IMAGE_PATH
)

page = result[0]

polys = page["rec_polys"]

print(
    f"Detected {len(polys)} text regions."
)


# --------------------------------------------------
# Load recognition models
# --------------------------------------------------

print()
print("=" * 60)
print("LOADING RECOGNITION MODELS")
print("=" * 60)

ocr_v6 = TextRecognition(
    model_name="PP-OCRv6_medium_rec"
)

ocr_latin = TextRecognition(
    model_name="latin_PP-OCRv5_mobile_rec"
)


# --------------------------------------------------
# Test each text region
# --------------------------------------------------

for index, poly in enumerate(polys):

    poly = np.array(
        poly
    )

    x_min = max(
        0,
        int(poly[:, 0].min())
    )

    x_max = min(
        image_array.shape[1],
        int(poly[:, 0].max())
    )

    y_min = max(
        0,
        int(poly[:, 1].min())
    )

    y_max = min(
        image_array.shape[0],
        int(poly[:, 1].max())
    )

    crop = image_array[
        y_min:y_max,
        x_min:x_max
    ]

    print()
    print("=" * 60)
    print(f"TEXT REGION {index + 1}")
    print("=" * 60)

    print(
        f"Coordinates: "
        f"{x_min}, {y_min} -> {x_max}, {y_max}"
    )


    # --------------------------------------------------
    # PP-OCRv6
    # --------------------------------------------------

    v6_result = ocr_v6.predict(
        input=crop
    )

    v6_text = ""

    for item in v6_result:

        v6_text = item["rec_text"]

    print()
    print("PP-OCRv6:")
    print(v6_text)


    # --------------------------------------------------
    # Latin PP-OCRv5
    # --------------------------------------------------

    latin_result = ocr_latin.predict(
        input=crop
    )

    latin_text = ""

    for item in latin_result:

        latin_text = item["rec_text"]

    print()
    print("Latin PP-OCRv5:")
    print(latin_text)


    # --------------------------------------------------
    # Tesseract
    # --------------------------------------------------

    tesseract_text = pytesseract.image_to_string(
        Image.fromarray(crop),
        lang="lit"
    )

    tesseract_text = tesseract_text.strip()

    print()
    print("Tesseract:")
    print(tesseract_text)