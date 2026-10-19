
import io
import wave

from models.model_config import get_model_config
from models.engine_registry import get_engine


_custom_tts_instances = {}

def get_tts_model_id(language_name):
    models_by_language = {
        "Lithuanian": "piper_lithuanian_reginute",
        "German": "piper_german_thorsten",
    }

    model_id = models_by_language.get(language_name)

    if not model_id:
        raise ValueError(
            f"No TTS model configured for language: {language_name}"
        )

    return model_id


def _get_custom_tts(model):
    model_id = model["id"]

    if model_id not in _custom_tts_instances:
        engine = get_engine(model["engine"])
        _custom_tts_instances[model_id] = engine()

    return _custom_tts_instances[model_id]


def synthesize_text(model_id, text, output_path):
    model = get_model_config(model_id)
    engine = get_engine(model["engine"])

    if model["engine"] == "piper":
        voice = engine.load(
            model["model_path"],
            config_path=model["config_path"],
        )

        with wave.open(str(output_path), "wb") as wav_file:
            voice.synthesize_wav(text, wav_file)

        return

    if model["engine"] == "piper_custom":
        tts = _get_custom_tts(model)
        audio = tts.synthesize([text])

        with open(output_path, "wb") as audio_file:
            audio_file.write(audio)

        return

    raise ValueError(f"Unsupported engine: {model['engine']}")


def synthesize_with_timestamps(model_id, segments):
    model = get_model_config(model_id)

    if model["engine"] == "piper_custom":
        tts = _get_custom_tts(model)
        return tts.synthesize_with_timestamps(segments)

    if model["engine"] == "piper":
        raise NotImplementedError(
            "Timestamped synthesis for the standard Piper engine "
            "has not been implemented yet."
        )

    raise ValueError(f"Unsupported engine: {model['engine']}")

def synthesize_audio_bytes(model_id, text):
    model = get_model_config(model_id)

    if model["engine"] == "piper_custom":
        tts = _get_custom_tts(model)
        return tts.synthesize([text])

    if model["engine"] == "piper":
        engine = get_engine(model["engine"])

        voice = engine.load(
            model["model_path"],
            config_path=model["config_path"],
        )

        wav_buffer = io.BytesIO()

        with wave.open(wav_buffer, "wb") as wav_file:
            voice.synthesize_wav(text, wav_file)

        return wav_buffer.getvalue()

    raise ValueError(f"Unsupported engine: {model['engine']}")
