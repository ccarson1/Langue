# api/utils/pronunciation_evaluator.py
import whisper
import tempfile
import os
import difflib
from django.core.files.base import ContentFile

# Load model once at module level (recommended for performance)
# Options: tiny, base, small, medium, large, turbo
model = whisper.load_model("base")   # Change to "small" or "medium" for better accuracy


def evaluate_pronunciation(audio_file, expected_text: str, mode="phrase", user=None):
    """
    Transcribe audio using Whisper and compare with expected text.
    """
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(suffix=".m4a", delete=False) as tmp_file:
            for chunk in audio_file.chunks():
                tmp_file.write(chunk)
            tmp_path = tmp_file.name

        # Transcribe with Whisper
        result = model.transcribe(
            tmp_path,
            language=None,           # Auto-detect
            fp16=False,              # Set True if you have GPU
            word_timestamps=False
        )

        recognized_text = result["text"].strip()

        # Clean up temp file
        os.unlink(tmp_path)

        # Calculate similarity
        similarity = difflib.SequenceMatcher(
            None, 
            expected_text.lower().strip(), 
            recognized_text.lower().strip()
        ).ratio()

        score = round(similarity * 100, 1)

        # Determine correctness
        threshold = 72 if mode == "word" else 65  # Slightly lower for longer phrases
        correct = score >= threshold

        # Generate feedback
        if correct:
            feedback = "Excellent pronunciation! 🎉"
        elif score >= 50:
            feedback = "Good effort! Focus on clarity and intonation."
        else:
            feedback = "Try again. Speak slowly and clearly."

        return {
            "correct": correct,
            "score": score,
            "feedback": feedback,
            "recognized": recognized_text,
            "expected": expected_text,
            "details": {
                "language": result.get("language", "unknown"),
                "confidence": round(result.get("avg_logprob", 0) * -10, 2)  # Rough confidence
            }
        }

    except Exception as e:
        print(f"Whisper error: {e}")
        return {
            "correct": False,
            "score": 0,
            "feedback": "Error processing audio. Please try again.",
            "recognized": "",
            "expected": expected_text
        }