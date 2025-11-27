import json
import io
import subprocess
import tempfile
import os
from vosk import Model, KaldiRecognizer

# Initialize Vosk model (downloads on first use)
try:
    model = Model(lang="en-us")
except Exception as e:
    print(f"Warning: Could not load Vosk model: {e}")
    model = None


def convert_to_wav(audio_bytes: bytes, input_format: str = "webm") -> bytes:
    """
    Convert audio to WAV format using ffmpeg.
    
    Args:
        audio_bytes: Raw audio data
        input_format: Input audio format (webm, ogg, mp3, etc.)
        
    Returns:
        WAV format audio bytes (16kHz mono PCM)
    """
    try:
        print(f"[Transcription] Converting {input_format} to WAV (16kHz mono)")
        
        # Create temporary files for input and output
        with tempfile.NamedTemporaryFile(suffix=f".{input_format}", delete=False) as input_file:
            input_file.write(audio_bytes)
            input_path = input_file.name
        
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as output_file:
            output_path = output_file.name
        
        try:
            # Use ffmpeg to convert to 16kHz mono WAV
            cmd = [
                "ffmpeg",
                "-i", input_path,
                "-acodec", "pcm_s16le",
                "-ar", "16000",
                "-ac", "1",
                "-y",  # Overwrite output
                output_path
            ]
            
            print(f"[Transcription] Running ffmpeg: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode != 0:
                print(f"[Transcription] ffmpeg error: {result.stderr}")
                raise Exception(f"ffmpeg conversion failed: {result.stderr}")
            
            # Read the converted WAV file
            with open(output_path, "rb") as f:
                wav_bytes = f.read()
            
            print(f"[Transcription] Conversion complete: {len(wav_bytes)} bytes")
            return wav_bytes
            
        finally:
            # Clean up temporary files
            try:
                os.unlink(input_path)
                os.unlink(output_path)
            except:
                pass
                
    except Exception as e:
        print(f"[Transcription] Error converting audio: {e}")
        import traceback
        traceback.print_exc()
        raise


def transcribe_audio(audio_bytes: bytes, audio_format: str = "webm") -> dict:
    """
    Transcribe audio using Vosk ASR engine.
    
    Args:
        audio_bytes: Raw audio data
        audio_format: Audio format (webm, wav, ogg, mp3)
        
    Returns:
        dict with transcript, confidence, and timing info
    """
    if not model:
        return {
            "transcript": "",
            "confidence": 0,
            "error": "Vosk model not available",
            "success": False
        }
    
    try:
        print(f"[Transcription] Processing {audio_format} audio, size: {len(audio_bytes)} bytes")
        
        # Convert to WAV if needed
        if audio_format.lower() != "wav":
            print(f"[Transcription] Converting {audio_format} to WAV...")
            wav_bytes = convert_to_wav(audio_bytes, audio_format)
        else:
            wav_bytes = audio_bytes
        
        print(f"[Transcription] WAV size: {len(wav_bytes)} bytes, starting recognition...")
        
        # Create recognizer
        rec = KaldiRecognizer(model, 16000)
        
        # Process WAV file
        # Skip WAV header (first 44 bytes)
        wav_data = wav_bytes[44:] if len(wav_bytes) > 44 else wav_bytes
        
        print(f"[Transcription] Processing {len(wav_data)} bytes of PCM audio data")
        
        # Feed audio data to recognizer
        final_result = None
        partial_result = None
        chunks_processed = 0
        
        # Process in chunks
        chunk_size = 4096
        for i in range(0, len(wav_data), chunk_size):
            chunk = wav_data[i : i + chunk_size]
            chunks_processed += 1
            if rec.AcceptWaveform(chunk):
                final_result = json.loads(rec.Result())
                print(f"[Transcription] Got final result at chunk {chunks_processed}: {final_result}")
        
        print(f"[Transcription] Processed {chunks_processed} chunks, getting final result...")
        
        # Get any remaining result
        if final_result is None:
            final_result = json.loads(rec.FinalResult())
            print(f"[Transcription] Got final result from FinalResult: {final_result}")
        
        # Extract transcript
        transcript = ""
        confidence = 0
        
        print(f"[Transcription] Final result structure: {final_result}")
        
        if "result" in final_result and final_result["result"]:
            # Detailed result with word-level confidence
            # Format: [{"conf": 1.0, "end": 1.5, "start": 0.5, "result": "word"}, ...]
            words = final_result["result"]
            transcript = " ".join([word.get("result", "") for word in words])
            confidences = [word.get("conf", 1.0) for word in words if "conf" in word]
            confidence = sum(confidences) / len(confidences) if confidences else 0
            print(f"[Transcription] Extracted {len(words)} words from result array, confidence: {confidence}")
        elif "text" in final_result:
            # Simple text result (most common)
            transcript = final_result.get("text", "").strip()
            confidence = 0.8  # Default confidence for simple text result
            print(f"[Transcription] Got text result: '{transcript}'")
        elif "partial" in final_result:
            # Partial result (intermediate)
            transcript = final_result.get("partial", "").strip()
            confidence = 0.5
            print(f"[Transcription] Got partial result: {transcript}")
        else:
            print(f"[Transcription] Unexpected result format: {final_result}")
        
        if not transcript:
            return {
                "transcript": "",
                "confidence": 0,
                "error": "No speech detected",
                "success": False
            }
        
        return {
            "transcript": transcript,
            "confidence": confidence,
            "raw_result": final_result,
            "success": True
        }
    except Exception as e:
        print(f"[Transcription] Error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "transcript": "",
            "confidence": 0,
            "error": str(e),
            "success": False
        }

