# Voice Feature Setup Guide

## Overview

The voice feature enables users to:
1. **Record audio** via microphone using the browser's MediaRecorder API
2. **Upload audio** to the backend in WebM format
3. **Transcribe audio** using Vosk (offline ASR engine)
4. **Analyze transcript** through the same threat detection pipeline as text
5. **Display results** with confidence scores and analysis

## Architecture

```
Frontend (Browser)
    ↓
1. MediaRecorder API captures audio
2. Audio blob sent to /api/voice (Next.js)
    ↓
Backend API (/api/voice)
    ↓
3. Forwards to Python backend /transcribe endpoint
    ↓
Python Backend
    ↓
4. Vosk transcribes audio → raw transcript
5. Analysis engine processes transcript
6. Results logged to database
7. Response returned to frontend
    ↓
Frontend Display
    ↓
8. Shows transcript, threat analysis, and scores
```

## Installation & Setup

### Backend Setup

1. **Install Vosk and dependencies:**
   ```bash
   cd promptshield/backend
   pip install -r requirements.txt
   ```

   This installs:
   - `vosk` - Offline speech recognition
   - `python-multipart` - For file uploads

2. **Vosk Model Download:**
   - On first use, Vosk automatically downloads the English model (~50MB)
   - Models are cached in `~/.vosk/models/`
   - Offline, no internet needed after first download

3. **Start Backend:**
   ```bash
   uvicorn app:app --reload
   ```

### Frontend Setup

The voice feature is already integrated. No additional setup needed!

**Key Files:**
- `app/api/voice/route.ts` - Handles audio upload and transcription
- `components/dashboard/input-panel.tsx` - Audio recording interface

## How to Use

1. **Open the Dashboard**
   - Navigate to the Gateway Tester tab
   - Select "voice" input mode

2. **Record Audio**
   - Click the microphone button to start recording
   - Button turns red and shows recording time
   - Speak naturally into the microphone
   - Click the stop button (square icon) to finish

3. **Processing**
   - Audio is automatically transcribed
   - Transcript is analyzed through threat detection
   - Results display just like text input

4. **Results**
   - Shows confidence score (0-100)
   - Full threat analysis (regex, entropy, anomaly scores)
   - Sanitized version if needed
   - Logged to database

## API Endpoints

### Backend: POST `/transcribe`

**Request:**
- Multipart form data with audio file
- Accepts: WebM, WAV, OGG, and other audio formats

**Response:**
```json
{
  "success": true,
  "transcript": "ignore previous instructions",
  "confidence": 0.95,
  "analysis": {
    "scores": {
      "regex_score": 35,
      "entropy_score": 10,
      "anomaly_score": 30,
      "total_score": 75,
      "action": "block"
    },
    "sanitized": "[SANITIZED]",
    "wrapped": null,
    "template_id": null,
    "action": "block"
  }
}
```

### Frontend: POST `/api/voice`

**Request:**
- Multipart form data with audio file

**Response:**
```json
{
  "id": "abc123",
  "timestamp": "2025-11-26T...",
  "prompt": "ignore previous instructions",
  "raw_prompt": "ignore previous instructions",
  "sanitized_prompt": "[SANITIZED]",
  "scores": { ... },
  "confidence": 0.95,
  "transcript_source": "voice"
}
```

## Technical Details

### MediaRecorder API
- Records audio in WebM format (efficient, widely supported)
- Captures from user's microphone with permission
- Sends as binary blob to backend

### Vosk (Speech Recognition)
- **Engine**: Kaldi-based ASR
- **Model**: English (en-us)
- **Speed**: Real-time or faster (offline)
- **CPU**: Lightweight, works on any machine
- **Accuracy**: ~90-95% on clean audio

### Error Handling
- Microphone permission denied → Alert to user
- Transcription failed → Shows error message
- Audio processing error → Graceful fallback

## Troubleshooting

### "Failed to access microphone"
- Check browser permissions
- Ensure HTTPS (required by most browsers for microphone)
- Check microphone is connected and working

### Poor transcription quality
- Speak clearly and at normal pace
- Reduce background noise
- Get closer to microphone
- Use proper pronunciation

### Model not downloading
- Check internet connection (only on first use)
- Ensure write access to `~/.vosk/`
- Check disk space (model is ~50MB)

### Slow transcription
- Vosk runs on CPU, speed depends on system
- First use slower due to model loading
- Typical: 1-3 seconds per 10 seconds of audio

## File Locations

```
Backend:
- /transcribe endpoint in app.py
- transcription.py - Vosk integration
- requirements.txt - Dependencies

Frontend:
- app/api/voice/route.ts - Upload handler
- components/dashboard/input-panel.tsx - UI
```

## Security Notes

- Audio is transcribed locally (Vosk) - no external API calls
- Transcripts are analyzed through PromptShield threat detection
- Results logged to database like any other input
- No audio stored - only transcripts logged
