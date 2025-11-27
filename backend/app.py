# backend/app.py
import time
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from detection_engine import compute_risk, sanitize_text
from ppa import wrap_prompt
from storage import SessionLocal, init_db, AttackLog
from transcription import transcribe_audio
from image_processor import analyze_image
from document_processor import analyze_document
from models import (
    AnalyzeRequest,
    AnalyzeResponse,
    LayerScores,
    AttackHistoryResponse,
    AttackLogItem,
)

app = FastAPI(title="PromptShield")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    start = time.perf_counter()

    raw_prompt = req.prompt

    # 1) Detection
    risk = compute_risk(raw_prompt)

    # 2) Sanitization (if needed)
    if risk["action"] in ("sanitize", "block"):
        sanitized_result = sanitize_text(raw_prompt)
        sanitized = sanitized_result["text"]
    else:
        sanitized = raw_prompt

    # 3) PPA wrapping (only if not blocked)
    wrapped = None
    template_id = None
    if risk["action"] != "block":
        wrapped, template_id = wrap_prompt(sanitized)

    elapsed_ms = (time.perf_counter() - start) * 1000.0

    # 4) Log to DB
    db: Session = next(get_db())
    log = AttackLog(
        raw_prompt=raw_prompt,
        sanitized_prompt=sanitized,
        wrapped_prompt=wrapped or "",
        action=risk["action"],
        regex_score=risk["regex_score"],
        entropy_score=risk["entropy_score"],
        anomaly_score=risk["anomaly_score"],
        total_score=risk["total_score"],
        ppa_template_id=template_id or "",
        processing_ms=elapsed_ms,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return AnalyzeResponse(
        scores=LayerScores(**risk),
        raw_prompt=raw_prompt,
        sanitized_prompt=sanitized,
        wrapped_prompt=wrapped,
        ppa_template_id=template_id,
        processing_ms=elapsed_ms,
    )


@app.get("/history", response_model=AttackHistoryResponse)
def history(limit: int = 50):
    db: Session = next(get_db())
    rows = (
        db.query(AttackLog)
        .order_by(AttackLog.id.desc())
        .limit(limit)
        .all()
    )

    items = [
        AttackLogItem(
            id=row.id,
            timestamp=row.timestamp.isoformat(),
            action=row.action,
            total_score=row.total_score,
            processing_ms=row.processing_ms,
            regex_score=row.regex_score,
            entropy_score=row.entropy_score,
            anomaly_score=row.anomaly_score,
            ppa_template_id=row.ppa_template_id or None,
            raw_prompt=row.raw_prompt,
            sanitized_prompt=row.sanitized_prompt,
            wrapped_prompt=row.wrapped_prompt,
        )
        for row in rows
    ]

    return AttackHistoryResponse(items=items)


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    """
    Transcribe audio file using Vosk ASR engine.
    Accepts: WAV, WebM, OGG, and other audio formats
    """
    try:
        # Read audio file
        audio_bytes = await file.read()
        print(f"[Transcribe] Received file: {file.filename}, Size: {len(audio_bytes)} bytes")
        
        # Get file extension
        file_extension = file.filename.split(".")[-1].lower() if file.filename else "webm"
        print(f"[Transcribe] Detected format: {file_extension}")
        
        # Transcribe audio
        result = transcribe_audio(audio_bytes, file_extension)
        print(f"[Transcribe] Transcription result: {result}")
        
        # If transcription was successful, analyze it like a regular prompt
        if result.get("success") and result.get("transcript"):
            transcript = result["transcript"]
            print(f"[Transcribe] Got transcript: {transcript[:100]}...")
            
            # Run through the same analysis pipeline
            risk = compute_risk(transcript)
            
            if risk["action"] in ("sanitize", "block"):
                sanitized_result = sanitize_text(transcript)
                sanitized = sanitized_result["text"]
            else:
                sanitized = transcript
            
            wrapped = None
            template_id = None
            if risk["action"] != "block":
                wrapped, template_id = wrap_prompt(sanitized)
            
            # Log to database
            db: Session = next(get_db())
            log = AttackLog(
                raw_prompt=transcript,
                sanitized_prompt=sanitized,
                wrapped_prompt=wrapped or "",
                action=risk["action"],
                regex_score=risk["regex_score"],
                entropy_score=risk["entropy_score"],
                anomaly_score=risk["anomaly_score"],
                total_score=risk["total_score"],
                ppa_template_id=template_id or "",
                processing_ms=0,
            )
            db.add(log)
            db.commit()
            db.refresh(log)
            
            print(f"[Transcribe] Analysis complete - action: {risk['action']}")
            
            return {
                "success": True,
                "transcript": transcript,
                "confidence": result.get("confidence", 0),
                "analysis": {
                    "scores": risk,
                    "sanitized": sanitized,
                    "wrapped": wrapped,
                    "template_id": template_id,
                    "action": risk["action"],
                }
            }
        else:
            error_msg = result.get("error", "Failed to transcribe audio")
            print(f"[Transcribe] Transcription failed: {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "transcript": ""
            }
    except Exception as e:
        print(f"[Transcribe] Exception: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "transcript": ""
        }


@app.post("/analyze-image")
async def analyze_image_endpoint(file: UploadFile = File(...)):
    """
    Analyze image for text content and threat indicators.
    Uses OCR to extract text, analyzes metadata, detects hidden commands.
    """
    try:
        # Read image file
        image_bytes = await file.read()
        print(f"[ImageAPI] Received image: {file.filename}, Size: {len(image_bytes)} bytes")
        
        # Analyze image
        analysis = analyze_image(image_bytes, file.filename or "image")
        print(f"[ImageAPI] Analysis complete: {analysis.get('combined_risk_score')}/100")
        
        # If text was extracted, analyze it like a prompt
        if analysis.get("success") and analysis.get("extracted_text"):
            extracted_text = analysis["extracted_text"]
            print(f"[ImageAPI] Analyzing extracted text: {extracted_text[:100]}...")
            
            # Run through threat detection pipeline
            risk = compute_risk(extracted_text)
            
            if risk["action"] in ("sanitize", "block"):
                sanitized_result = sanitize_text(extracted_text)
                sanitized = sanitized_result["text"]
            else:
                sanitized = extracted_text
            
            wrapped = None
            template_id = None
            if risk["action"] != "block":
                wrapped, template_id = wrap_prompt(sanitized)
            
            # Log to database
            db: Session = next(get_db())
            log = AttackLog(
                raw_prompt=extracted_text,
                sanitized_prompt=sanitized,
                wrapped_prompt=wrapped or "",
                action=risk["action"],
                regex_score=risk["regex_score"],
                entropy_score=risk["entropy_score"],
                anomaly_score=risk["anomaly_score"],
                total_score=risk["total_score"],
                ppa_template_id=template_id or "",
                processing_ms=0,
            )
            db.add(log)
            db.commit()
            db.refresh(log)
            
            print(f"[ImageAPI] Threat detection complete - Action: {risk['action']}")
            
            return {
                "success": True,
                "image_analysis": analysis,
                "extracted_text": extracted_text,
                "threat_analysis": {
                    "scores": risk,
                    "action": risk["action"],
                    "sanitized": sanitized,
                    "wrapped": wrapped,
                    "template_id": template_id,
                },
                "ocr_confidence": analysis.get("ocr_confidence", 0)
            }
        else:
            # No text extracted or analysis failed
            error = analysis.get("error", "No text found in image")
            print(f"[ImageAPI] Image analysis unsuccessful: {error}")
            
            # Still log if there were suspicious indicators
            if analysis.get("metadata", {}).get("suspicious_indicators"):
                db: Session = next(get_db())
                log = AttackLog(
                    raw_prompt=f"[IMAGE] {file.filename}: {', '.join(analysis['metadata']['suspicious_indicators'])}",
                    sanitized_prompt="",
                    wrapped_prompt="",
                    action="block",
                    regex_score=0,
                    entropy_score=0,
                    anomaly_score=analysis.get("combined_risk_score", 0),
                    total_score=analysis.get("combined_risk_score", 0),
                    ppa_template_id="",
                    processing_ms=0,
                )
                db.add(log)
                db.commit()
            
            return {
                "success": False,
                "error": error,
                "image_analysis": analysis,
                "extracted_text": ""
            }
    except Exception as e:
        print(f"[ImageAPI] Exception: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "extracted_text": ""
        }


@app.post("/analyze-document")
async def analyze_document_endpoint(file: UploadFile = File(...)):
    """
    Analyze document (PDF, DOCX, DOC, TXT, RTF) for text content and threat indicators.
    Extracts text and analyzes for jailbreak attempts, encoded payloads, macros, etc.
    """
    try:
        # Read document file
        doc_bytes = await file.read()
        print(f"[DocAPI] Received document: {file.filename}, Size: {len(doc_bytes)} bytes")
        
        # Analyze document
        analysis = analyze_document(doc_bytes, file.filename or "document")
        print(f"[DocAPI] Analysis complete: {analysis.get('threat_analysis', {}).get('threat_score', 0)}/100")
        
        # If text was extracted, analyze it like a prompt
        if analysis.get("success") and analysis.get("extracted_text"):
            extracted_text = analysis["extracted_text"]
            print(f"[DocAPI] Analyzing extracted text: {extracted_text[:100]}...")
            
            # Run through threat detection pipeline
            risk = compute_risk(extracted_text)
            
            if risk["action"] in ("sanitize", "block"):
                sanitized_result = sanitize_text(extracted_text)
                sanitized = sanitized_result["text"]
            else:
                sanitized = extracted_text
            
            wrapped = None
            template_id = None
            if risk["action"] != "block":
                wrapped, template_id = wrap_prompt(sanitized)
            
            # Log to database
            db: Session = next(get_db())
            log = AttackLog(
                raw_prompt=extracted_text,
                sanitized_prompt=sanitized,
                wrapped_prompt=wrapped or "",
                action=risk["action"],
                regex_score=risk["regex_score"],
                entropy_score=risk["entropy_score"],
                anomaly_score=risk["anomaly_score"],
                total_score=risk["total_score"],
                ppa_template_id=template_id or "",
                processing_ms=0,
            )
            db.add(log)
            db.commit()
            db.refresh(log)
            
            print(f"[DocAPI] Threat detection complete - Action: {risk['action']}")
            
            return {
                "success": True,
                "document_analysis": analysis,
                "extracted_text": extracted_text,
                "threat_analysis": {
                    "scores": risk,
                    "action": risk["action"],
                    "sanitized": sanitized,
                    "wrapped": wrapped,
                    "template_id": template_id,
                },
                "document_threat_indicators": analysis.get("threat_analysis", {})
            }
        else:
            # No text extracted or analysis failed
            error = analysis.get("error", "Could not extract text from document")
            print(f"[DocAPI] Document analysis unsuccessful: {error}")
            
            # Still log if there were suspicious indicators
            threat_indicators = analysis.get("threat_analysis", {}).get("threat_indicators", [])
            if threat_indicators:
                db: Session = next(get_db())
                log = AttackLog(
                    raw_prompt=f"[DOCUMENT] {file.filename}: {', '.join(threat_indicators[:3])}",
                    sanitized_prompt="",
                    wrapped_prompt="",
                    action="block",
                    regex_score=0,
                    entropy_score=0,
                    anomaly_score=analysis.get("threat_analysis", {}).get("threat_score", 0),
                    total_score=analysis.get("threat_analysis", {}).get("threat_score", 0),
                    ppa_template_id="",
                    processing_ms=0,
                )
                db.add(log)
                db.commit()
            
            return {
                "success": False,
                "error": error,
                "document_analysis": analysis,
                "extracted_text": "",
                "document_threat_indicators": analysis.get("threat_analysis", {})
            }
    except Exception as e:
        print(f"[DocAPI] Exception: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "extracted_text": ""
        }
