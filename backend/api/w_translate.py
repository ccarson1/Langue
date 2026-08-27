# from transformers import AutoTokenizer, AutoModelForSeq2SeqLM


# # # Load tokenizer and model
# # model_name = "Helsinki-NLP/opus-mt-tc-big-lt-en"
# # tokenizer = AutoTokenizer.from_pretrained(model_name)
# # model = AutoModelForSeq2SeqLM.from_pretrained(model_name)


# # def translate_word(text):

# #     Tokenize and translate
# #     inputs = tokenizer(text, return_tensors="pt")
# #     outputs = model.generate(**inputs)

# #     Decode output
# #     translated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)

# #     return translated_text


# import os
# from transformers import M2M100ForConditionalGeneration, M2M100Tokenizer

# model_name = "facebook/m2m100_418M"
# save_path = "./models/m2m100"

# if not os.path.exists(save_path):
#     print("Downloading model...")
#     tokenizer = M2M100Tokenizer.from_pretrained(model_name)
#     model = M2M100ForConditionalGeneration.from_pretrained(model_name)

#     tokenizer.save_pretrained(save_path)
#     model.save_pretrained(save_path)
# else:
#     print("Loading model from local storage...")
#     tokenizer = M2M100Tokenizer.from_pretrained(save_path)
#     model = M2M100ForConditionalGeneration.from_pretrained(save_path)


# def translate_word(text, src_lang, tgt_lang):
#     tokenizer.src_lang = src_lang
#     encoded = tokenizer(text, return_tensors="pt")

#     generated_tokens = model.generate(
#         **encoded,
#         forced_bos_token_id=tokenizer.get_lang_id(tgt_lang)
#     )

#     return tokenizer.decode(generated_tokens[0], skip_special_tokens=True)


import os
from contextvars import ContextVar

from transformers import (
    AutoTokenizer,
    AutoModelForSeq2SeqLM,
    M2M100ForConditionalGeneration,
    M2M100Tokenizer,
)

from .models import UserSetting


# =========================================================
# Per-request model state
# =========================================================

MODEL_TYPE = ContextVar("MODEL_TYPE", default=None)
TOKENIZER = ContextVar("TOKENIZER", default=None)
MODEL = ContextVar("MODEL", default=None)


# =========================================================
# Available model implementations
# =========================================================

MODELS = {
    "m2m100": {
        "tokenizer_class": M2M100Tokenizer,
        "model_class": M2M100ForConditionalGeneration,
    },

    "opus": {
        "tokenizer_class": AutoTokenizer,
        "model_class": AutoModelForSeq2SeqLM,
    },
}


# =========================================================
# Load model
# =========================================================

def load_model(translation_model):

    model_type = translation_model.model_type

    if model_type not in MODELS:
        raise ValueError(
            f"Unknown model type: {model_type}"
        )

    config = MODELS[model_type]

    tokenizer_class = config["tokenizer_class"]
    model_class = config["model_class"]

    model_name = translation_model.model_name

    save_path = os.path.join(
        "./models",
        translation_model.save_path
    )

    # -----------------------------------------------------
    # Download model if it doesn't exist
    # -----------------------------------------------------

    if not os.path.exists(save_path):

        print(
            f"Downloading {translation_model.name}..."
        )

        os.makedirs(
            save_path,
            exist_ok=True
        )

        tokenizer = tokenizer_class.from_pretrained(
            model_name
        )

        model = model_class.from_pretrained(
            model_name
        )

        tokenizer.save_pretrained(
            save_path
        )

        model.save_pretrained(
            save_path
        )

    # -----------------------------------------------------
    # Load existing model
    # -----------------------------------------------------

    else:

        print(
            f"Loading {translation_model.name} "
            f"from local storage..."
        )

        tokenizer = tokenizer_class.from_pretrained(
            save_path
        )

        model = model_class.from_pretrained(
            save_path
        )

    return model_type, tokenizer, model


# =========================================================
# Load the model selected by the user
# =========================================================

def load_user_model(user):

    user_settings = UserSetting.objects.select_related(
        "translationModel"
    ).get(
        user=user
    )

    translation_model = user_settings.translationModel

    model_type, tokenizer, model = load_model(
        translation_model
    )

    MODEL_TYPE.set(model_type)
    TOKENIZER.set(tokenizer)
    MODEL.set(model)


# =========================================================
# Translate
# =========================================================

def translate_word(text, src_lang, tgt_lang):

    model_type = MODEL_TYPE.get()
    tokenizer = TOKENIZER.get()
    model = MODEL.get()

    if model_type is None:
        raise RuntimeError(
            "No translation model has been loaded for this request. "
            "Call load_user_model(user) before translate_word()."
        )

    # -----------------------------------------------------
    # M2M100
    # -----------------------------------------------------

    if model_type == "m2m100":

        tokenizer.src_lang = src_lang

        encoded = tokenizer(
            text,
            return_tensors="pt"
        )

        generated_tokens = model.generate(
            **encoded,
            forced_bos_token_id=tokenizer.get_lang_id(
                tgt_lang
            )
        )

        return tokenizer.decode(
            generated_tokens[0],
            skip_special_tokens=True
        )

    # -----------------------------------------------------
    # OPUS
    # -----------------------------------------------------

    elif model_type == "opus":

        inputs = tokenizer(
            text,
            return_tensors="pt"
        )

        outputs = model.generate(
            **inputs
        )

        return tokenizer.decode(
            outputs[0],
            skip_special_tokens=True
        )

    else:

        raise ValueError(
            f"Unsupported model type: {model_type}"
        )