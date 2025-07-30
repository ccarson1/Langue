from transformers import AutoTokenizer, AutoModelForSeq2SeqLM


def translate_word(text):

    # Load tokenizer and model
    model_name = "Helsinki-NLP/opus-mt-tc-big-lt-en"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_name)


    # Tokenize and translate
    inputs = tokenizer(text, return_tensors="pt")
    outputs = model.generate(**inputs)

    # Decode output
    translated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)

    return translated_text