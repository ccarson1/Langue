from stt import SpeechToText

stt_obj = SpeechToText(
    model_size="large-v3",
    device="cpu",
    compute_type="int8",
)

result = stt_obj.transcribe_with_timestamps(
    "C:\dev\Langue\\backend\\api\media\\records\\1112fd5e-1415-4f08-b0b6-dd41fc1483a7.mp4",
    language="lt",
)

print(result)