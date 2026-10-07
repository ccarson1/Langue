import io
import os
import wave
import sys

import numpy as np
from piper import PiperVoice
sys.path.insert( 0, os.path.join( os.path.dirname(os.path.dirname(__file__)), 'models', 'piper', 'lt_LT-reginute1-medium' ) )

from phonemize_lithuanian import LithuanianPhonemizer
from synth_reginute import ReginuteSynth, i_int16


class TTS:
    """
    Dynamic text-to-speech interface.

    Add additional TTS models by creating another method and
    adding it to the model dispatcher in synthesize().
    """

    def __init__(self):
        self._piper_voice = None
        self._piper_phonemizer = None
        self._piper_synth = None

    def synthesize(self, texts, model="piper"):
        """
        Convert an array of text strings into one audio file.

        Args:
            texts: List of text strings.
            model: TTS model to use.

        Returns:
            WAV audio bytes.
        """

        if not texts:
            raise ValueError("No text was provided.")

        if model == "piper":
            return self.piper(texts)

        raise ValueError(f"Unsupported TTS model: {model}")

    def _load_piper(self):
        """
        Load the Piper Reginutė model and Lithuanian phonemizer.

        The model is loaded only once and reused for subsequent
        synthesis requests.
        """

        if self._piper_synth is not None:
            return

        base_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "models",
            "piper",
            "lt_LT-reginute1-medium",
        )

        model_path = os.path.join(
            base_path,
            "lt_LT-reginute1-medium.onnx",
        )

        dictionary_path = os.path.join(
            base_path,
            "lt_kirciai.tsv",
        )

        letters_path = os.path.join(
            base_path,
            "lt_raides.tsv",
        )

        vocatives_path = os.path.join(
            base_path,
            "lt_kreipiniai.tsv",
        )

        self._piper_voice = PiperVoice.load(model_path)

        self._piper_phonemizer = LithuanianPhonemizer(
            dictionary_path=dictionary_path,
            letters_path=letters_path,
            vocatives_path=vocatives_path,
        )

        self._piper_synth = ReginuteSynth(
            voice=self._piper_voice,
            phonemizer=self._piper_phonemizer,
        )

    def piper(self, texts):
        """
        Process each text string with Piper and append the
        resulting audio together into one WAV file.

        Args:
            texts: List of text strings.

        Returns:
            WAV audio bytes.
        """

        self._load_piper()

        audio_parts = []

        for text in texts:
            if not text:
                continue

            audio = self._piper_synth.synthesize(text)

            if audio is None or len(audio) == 0:
                continue

            audio_parts.append(audio)

        if not audio_parts:
            raise ValueError("No audio was generated.")

        combined_audio = np.concatenate(audio_parts)

        wav_buffer = io.BytesIO()

        with wave.open(wav_buffer, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(
                self._piper_voice.config.sample_rate
            )
            wav_file.writeframes(
                i_int16(combined_audio)
            )

        wav_buffer.seek(0)

        return wav_buffer.getvalue()