from stt import SpeechToText

stt_obj = SpeechToText(
    model_size="large-v3",
    device="cpu",
    compute_type="int8",
)

result = stt_obj.transcribe(
    "C:\dev\Langue\\backend\\api\media\\records\\audio.mp3",
    language="lt",
)

print(result["text"])