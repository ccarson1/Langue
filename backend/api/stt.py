from faster_whisper import WhisperModel


class SpeechToText:
    def __init__(
        self,
        model_size="medium",
        device="cpu",
        compute_type="int8",
    ):
        """
        model_size:
            tiny, base, small, medium, large-v3

        device:
            cuda or cpu

        compute_type:
            float16, int8_float16, int8
        """

        self.model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
        )

    def transcribe(
        self,
        audio_file,
        language=None,
        beam_size=5,
    ):
        """
        Returns plain text transcript.
        """

        segments, info = self.model.transcribe(
            audio_file,
            language=language,
            beam_size=beam_size,
        )

        transcript = " ".join(
            segment.text.strip()
            for segment in segments
        )

        return {
            "text": transcript,
            "language": info.language,
            "language_probability": info.language_probability,
        }

    def transcribe_with_timestamps(
        self,
        audio_file,
        language=None,
        beam_size=5,
    ):
        """
        Returns transcript with segment timestamps.
        """

        segments, info = self.model.transcribe(
            audio_file,
            language=language,
            beam_size=beam_size,
        )

        results = []

        for segment in segments:
            results.append(
                {
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text.strip(),
                    "translated": ""
                }
            )
            print("start: ", segment.start, "end: ", segment.end, "text: ", segment.text.strip())
        return {
            "segments": results,
            "language": info.language,
            "language_probability": info.language_probability,
        }
    


    def transcribe_words(
        self,
        audio_file,
        language=None,
        beam_size=5,
    ):
        """
        Returns word-level timestamps.
        """

        segments, info = self.model.transcribe(
            audio_file,
            language=language,
            beam_size=beam_size,
            word_timestamps=True,
        )

        words = []

        for segment in segments:
            if segment.words:
                for word in segment.words:
                    words.append(
                        {
                            "word": word.word,
                            "start": word.start,
                            "end": word.end,
                            "probability": word.probability,
                        }
                    )

        return {
            "words": words,
            "language": info.language,
            "language_probability": info.language_probability,
        }
    
