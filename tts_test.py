# import sys;


# sys.path.insert(0, 'backend/models/piper/lt_LT-reginute1-medium')
# sys.path.insert(0, 'backend')
# from api.tts import TTS; tts=TTS()

# sentences = [
#     "Labas rytas.",
#     "Kaip tau sekasi?",
#     "Man labai gerai.",
# ]

# audio = tts.synthesize(sentences, model="piper")

# open('tts_class_test.wav','wb').write(audio)

# print('Created tts_class_test.wav')
# print('Bytes:', len(audio))
#//////////////////////////////////////////////////////////////////////////////#

# from piper import PiperVoice
# from piper.config import SynthesisConfig
# import inspect
# import piper
# import os
# import synth_reginute

# print(synth_reginute.__file__)

# print(os.path.dirname(piper.__file__))

# print(inspect.signature(PiperVoice.synthesize))
# print(inspect.signature(PiperVoice.synthesize_wav))
# print(inspect.signature(SynthesisConfig))

#//////////////////////////////////////////////////////////////////////////////#

import wave
import io
import os
import sys;

sys.path.insert(0, 'backend/models/piper/lt_LT-reginute1-medium')
sys.path.insert(0, 'backend')

from api.tts import TTS; tts=TTS()


def append_wav(existing_wav, new_wav):

    existing = wave.open(io.BytesIO(existing_wav), 'rb')
    new = wave.open(io.BytesIO(new_wav), 'rb')

    if (
        existing.getnchannels() != new.getnchannels()
        or existing.getsampwidth() != new.getsampwidth()
        or existing.getframerate() != new.getframerate()
    ):
        raise ValueError("WAV files have different audio formats.")

    output = io.BytesIO()

    with wave.open(output, 'wb') as wav:
        wav.setnchannels(existing.getnchannels())
        wav.setsampwidth(existing.getsampwidth())
        wav.setframerate(existing.getframerate())

        wav.writeframes(existing.readframes(existing.getnframes()))
        wav.writeframes(new.readframes(new.getnframes()))

    existing.close()
    new.close()

    return output.getvalue()


new_audio = tts.synthesize(
    ["Netrukus ėmė lyti."],
    model="piper"
)


if os.path.exists('tts_class_test.wav'):

    with open('tts_class_test.wav', 'rb') as file:
        previous_audio = file.read()

    audio = append_wav(previous_audio, new_audio)

else:

    audio = new_audio


open('tts_class_test.wav', 'wb').write(audio)

print('Updated tts_class_test.wav')
print('Bytes:', len(audio))
