from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

# Load tokenizer and model
model_name = "Helsinki-NLP/opus-mt-tc-big-lt-en"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)


def translate_word(text):

    


    # Tokenize and translate
    inputs = tokenizer(text, return_tensors="pt")
    outputs = model.generate(**inputs)

    # Decode output
    translated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)

    return translated_text


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


# def translate_word(text, src_lang="ru", tgt_lang="en"):
#     tokenizer.src_lang = src_lang
#     encoded = tokenizer(text, return_tensors="pt")

#     generated_tokens = model.generate(
#         **encoded,
#         forced_bos_token_id=tokenizer.get_lang_id(tgt_lang)
#     )

#     return tokenizer.decode(generated_tokens[0], skip_special_tokens=True)

