
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from api.tts import TTS

tts = TTS()

result = tts.synthesize_with_timestamps([
    {"id": "word_1", "text": "Labas"},
    {"id": "word_2", "text": "rytas"},
    {"id": "phrase_1", "text": "Kaip tau sekasi?"},
])

audio_path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "test_grammar_audio.wav",
)

with open(audio_path, "wb") as audio_file:
    audio_file.write(result["audio"])

print("Audio saved to:", audio_path)
print("Timestamps:")

for segment_id, timing in result["segments"].items():
    print(segment_id, timing)
