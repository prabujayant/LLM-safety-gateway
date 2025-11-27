import io
import json
from PIL import Image
import piexif
import easyocr
from typing import Dict, List, Tuple

# Initialize OCR reader (cached globally to avoid reloading)
try:
    reader = easyocr.Reader(['en'], gpu=False)
    print("[ImageProcessor] EasyOCR initialized successfully")
except Exception as e:
    print(f"[ImageProcessor] Warning: Could not initialize EasyOCR: {e}")
    reader = None


def extract_metadata(image_bytes: bytes) -> Dict:
    """
    Extract image metadata including EXIF data and file info.
    
    Args:
        image_bytes: Raw image data
        
    Returns:
        dict with metadata information
    """
    try:
        metadata = {
            "file_size": len(image_bytes),
            "exif": {},
            "suspicious_indicators": []
        }
        
        # Load image to get basic info
        image = Image.open(io.BytesIO(image_bytes))
        metadata["width"] = image.width
        metadata["height"] = image.height
        metadata["format"] = image.format
        metadata["mode"] = image.mode
        metadata["has_transparency"] = image.mode in ('RGBA', 'LA', 'P')
        
        print(f"[ImageProcessor] Image: {metadata['width']}x{metadata['height']}, "
              f"Format: {metadata['format']}, Size: {metadata['file_size']} bytes")
        
        # Extract EXIF data
        try:
            exif_dict = piexif.load(io.BytesIO(image_bytes))
            if "0th" in exif_dict:
                for tag, value in exif_dict["0th"].items():
                    try:
                        tag_name = piexif.TAGS["0th"][tag]["name"]
                        metadata["exif"][tag_name] = str(value)
                    except:
                        pass
            
            # Check for suspicious metadata
            if metadata["exif"].get("UserComment"):
                metadata["suspicious_indicators"].append("Has user comments in EXIF")
        except:
            pass
        
        # Flag suspicious characteristics
        if image.width > 5000 or image.height > 5000:
            metadata["suspicious_indicators"].append("Very large image dimensions")
        
        if metadata["file_size"] > 50 * 1024 * 1024:  # 50MB
            metadata["suspicious_indicators"].append("Large file size (suspicious)")
        
        if metadata["has_transparency"]:
            metadata["suspicious_indicators"].append("Has transparency layer (could hide text)")
        
        return metadata
    except Exception as e:
        print(f"[ImageProcessor] Error extracting metadata: {e}")
        return {
            "file_size": len(image_bytes),
            "error": str(e),
            "suspicious_indicators": ["Could not fully analyze metadata"]
        }


def extract_text_from_image(image_bytes: bytes) -> Tuple[str, List[Dict], float]:
    """
    Extract text from image using EasyOCR.
    Handles: visible text, hidden text, rotated text, low-contrast text.
    
    Args:
        image_bytes: Raw image data
        
    Returns:
        Tuple of (extracted_text, detailed_results, confidence_score)
    """
    if not reader:
        print("[ImageProcessor] OCR reader not available")
        return "", [], 0.0
    
    try:
        print(f"[ImageProcessor] Starting OCR extraction ({len(image_bytes)} bytes)")
        
        # Load image
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if needed (JPEG compatible format)
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to numpy array for OCR
        import numpy as np
        image_array = np.array(image)
        
        # Run OCR
        results = reader.readtext(image_array)
        
        print(f"[ImageProcessor] OCR found {len(results)} text blocks")
        
        # Extract text and confidence
        extracted_texts = []
        total_confidence = 0
        
        for (bbox, text, confidence) in results:
            extracted_texts.append(text)
            total_confidence += confidence
            print(f"[ImageProcessor] Found: '{text}' (confidence: {confidence:.2f})")
        
        full_text = " ".join(extracted_texts)
        avg_confidence = total_confidence / len(results) if results else 0
        
        print(f"[ImageProcessor] Extracted text ({avg_confidence:.2f} avg confidence): {full_text[:100]}...")
        
        # Format detailed results
        detailed = [
            {
                "text": text,
                "confidence": float(confidence),
                "bbox": str(bbox)
            }
            for bbox, text, confidence in results
        ]
        
        return full_text, detailed, avg_confidence
    except Exception as e:
        print(f"[ImageProcessor] Error extracting text: {e}")
        import traceback
        traceback.print_exc()
        return "", [], 0.0


def detect_hidden_content(extracted_text: str, image_bytes: bytes) -> Dict:
    """
    Detect suspicious patterns that might indicate hidden commands or injections.
    
    Args:
        extracted_text: Text extracted from image
        image_bytes: Raw image data
        
    Returns:
        dict with detection results
    """
    detections = {
        "hidden_instructions": [],
        "encoded_patterns": [],
        "suspicious_urls": [],
        "jailbreak_attempts": [],
        "risk_score": 0
    }
    
    # Common jailbreak phrases
    jailbreak_phrases = [
        "ignore previous", "disregard", "override", "bypass",
        "dan mode", "unrestricted mode", "developer mode",
        "ignore instructions", "forget all", "reset system",
        "prompt injection", "system prompt", "hidden instructions"
    ]
    
    text_lower = extracted_text.lower()
    
    # Check for jailbreak attempts
    for phrase in jailbreak_phrases:
        if phrase in text_lower:
            detections["jailbreak_attempts"].append(phrase)
            detections["risk_score"] += 15
    
    # Check for encoded patterns (base64, hex, etc.)
    import re
    
    # Base64-like patterns
    if re.search(r'[A-Za-z0-9+/]{40,}={0,2}', extracted_text):
        detections["encoded_patterns"].append("Base64-like string detected")
        detections["risk_score"] += 10
    
    # Hex encoding patterns
    if re.search(r'0x[0-9a-fA-F]{20,}', extracted_text):
        detections["encoded_patterns"].append("Hex encoding detected")
        detections["risk_score"] += 10
    
    # URL patterns
    urls = re.findall(r'https?://[^\s]+', extracted_text)
    if urls:
        detections["suspicious_urls"] = urls
        detections["risk_score"] += 5 * len(urls)
    
    # Command injection patterns
    command_patterns = [
        r'\$\(.*\)',  # $(command)
        r'`.*`',      # backticks
        r'\|\s*.*\|', # pipes
        r'&&\s*',     # command chaining
        r';\s*rm\s*', # rm commands
    ]
    
    for pattern in command_patterns:
        if re.search(pattern, extracted_text):
            detections["hidden_instructions"].append(f"Potential command injection: {pattern}")
            detections["risk_score"] += 20
    
    # Normalize risk score to 0-100
    detections["risk_score"] = min(100, detections["risk_score"])
    
    print(f"[ImageProcessor] Hidden content detection risk: {detections['risk_score']}")
    
    return detections


def analyze_image(image_bytes: bytes, filename: str = "image") -> Dict:
    """
    Comprehensive image analysis combining OCR, metadata, and threat detection.
    
    Args:
        image_bytes: Raw image data
        filename: Original filename
        
    Returns:
        dict with complete analysis results
    """
    try:
        print(f"[ImageProcessor] Starting comprehensive analysis for {filename}")
        
        # 1. Extract metadata
        metadata = extract_metadata(image_bytes)
        
        # 2. Extract text via OCR
        extracted_text, ocr_details, confidence = extract_text_from_image(image_bytes)
        
        # 3. Detect hidden content
        hidden_content = detect_hidden_content(extracted_text, image_bytes)
        
        # 4. Calculate combined risk score
        base_risk = hidden_content["risk_score"]
        metadata_risk = len(metadata.get("suspicious_indicators", [])) * 5
        ocr_confidence_factor = (1 - confidence) * 30 if confidence < 0.7 else 0
        
        combined_risk = min(100, base_risk + metadata_risk + ocr_confidence_factor)
        
        result = {
            "success": True,
            "extracted_text": extracted_text,
            "ocr_confidence": confidence,
            "ocr_details": ocr_details,
            "metadata": metadata,
            "hidden_content_analysis": hidden_content,
            "combined_risk_score": combined_risk,
            "analysis_summary": {
                "text_found": len(extracted_text) > 0,
                "text_blocks": len(ocr_details),
                "confidence": f"{confidence:.2%}",
                "suspicious_indicators": len(metadata.get("suspicious_indicators", [])),
                "jailbreak_attempts": len(hidden_content.get("jailbreak_attempts", [])),
                "encoded_patterns": len(hidden_content.get("encoded_patterns", []))
            }
        }
        
        print(f"[ImageProcessor] Analysis complete - Risk: {combined_risk}/100, "
              f"Text blocks: {len(ocr_details)}, Confidence: {confidence:.2%}")
        
        return result
    except Exception as e:
        print(f"[ImageProcessor] Error in image analysis: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "extracted_text": "",
            "combined_risk_score": 50  # Default high risk on error
        }
