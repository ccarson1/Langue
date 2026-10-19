
from piper import PiperVoice
import wave

model_path = r"C:\dev\Langue\backend\models\piper\de_DE-thorsten-medium\de_DE-thorsten-medium.onnx"
config_path = model_path + ".json"

voice = PiperVoice.load(
    model_path,
    config_path=config_path,
)

with wave.open(r"C:\dev\Langue\test_german.wav", "wb") as wav_file:
    voice.synthesize_wav("Die Frau liest.", wav_file)

print("German audio saved to C:\\dev\\Langue\\test_german.wav")
