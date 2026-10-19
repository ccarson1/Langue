
def get_engine(engine_name):
    if engine_name == "piper":
        from piper import PiperVoice
        return PiperVoice

    if engine_name == "piper_custom":
        from api.tts import TTS
        return TTS

    raise ValueError(f"Unknown AI engine: {engine_name}")
