# backend/detection_engine.py
import math
import re
import base64
from typing import Dict, Any

import numpy as np
from sklearn.ensemble import IsolationForest

# ------------ 1. Regex patterns (direct injection) ------------

INJECTION_PATTERNS = [
    r"\bignore (all )?previous instructions\b",
    r"\bdisregard (the )?(above|earlier) (rules|instructions)\b",
    r"\b(reveal|show|print) (the )?(system|hidden|internal) prompt\b",
    r"\[SYSTEM\]",
    r"you are now in (developer|god) mode",
    r"\bpretend (you are|to be)\b",
    r"\boverride safety\b",
]

regex_compiled = [re.compile(pat, re.IGNORECASE) for pat in INJECTION_PATTERNS]


def regex_score(text: str) -> int:
    """
    Returns 0-40 based on number/strength of matches.
    Simple heuristic: any match → at least 20; many matches → up to 40.
    """
    matches = sum(bool(r.search(text)) for r in regex_compiled)
    if matches == 0:
        return 0
    if matches == 1:
        return 25
    if matches == 2:
        return 35
    return 40


# ------------ 2. Entropy analysis (detect encoding/obfuscation) ------------

def shannon_entropy(text: str) -> float:
    if not text:
        return 0.0
    freq = {}
    for ch in text:
        freq[ch] = freq.get(ch, 0) + 1
    ent = 0.0
    length = len(text)
    for count in freq.values():
        p = count / length
        ent -= p * math.log2(p)
    return ent


def entropy_score(text: str) -> int:
    """
    Map entropy to a 0-30 risk bucket.
    - normal English usually ~3.5–4.0 bits/char
    - base64/obfuscated ~4.5–5.5+
    """
    ent = shannon_entropy(text)
    # Basic heuristics; tune with data
    if ent < 3.7:
        return 0
    elif ent < 4.3:
        return 10
    elif ent < 4.8:
        return 20
    else:
        return 30


# ------------ 3. Lightweight anomaly detection (IsolationForest) ------------

def extract_features(text: str) -> np.ndarray:
    """
    Very cheap handcrafted features (0.1–0.5 ms scale).
    In a real system, train this model offline and just load it.
    """
    length = len(text)
    num_newlines = text.count("\n")
    num_digits = sum(ch.isdigit() for ch in text)
    num_special = sum(not ch.isalnum() and not ch.isspace() for ch in text)
    upper_ratio = sum(ch.isupper() for ch in text) / length if length else 0
    digit_ratio = num_digits / length if length else 0
    special_ratio = num_special / length if length else 0
    return np.array(
        [
            length,
            num_newlines,
            num_digits,
            num_special,
            upper_ratio,
            digit_ratio,
            special_ratio,
        ],
        dtype=float,
    ).reshape(1, -1)


class AnomalyModel:
    def __init__(self):
        
        rng = np.random.RandomState(42)
        benign_samples = []
        for _ in range(200):
            length = rng.randint(10, 500)
            newlines = rng.randint(0, 5)
            digits = rng.randint(0, length // 5 + 1)
            specials = rng.randint(0, length // 10 + 1)
            upper_ratio = rng.uniform(0, 0.3)
            digits_ratio = digits / length
            specials_ratio = specials / length
            benign_samples.append(
                [
                    length,
                    newlines,
                    digits,
                    specials,
                    upper_ratio,
                    digits_ratio,
                    specials_ratio,
                ]
            )
        X = np.array(benign_samples)
        self.model = IsolationForest(
            n_estimators=50,
            max_samples="auto",
            contamination=0.05,
            random_state=42,
            n_jobs=1,
        )
        self.model.fit(X)

    def anomaly_score(self, text: str) -> int:
        """
        Return 0-30 based on anomaly. We map IsolationForest score to a bucket.
        """
        feat = extract_features(text)
        # score_samples: higher is more normal. We invert.
        raw = self.model.score_samples(feat)[0]
        # Typical scores around -0.5 to 0.2; normalize heuristically.
        normalized = max(0.0, min(1.0, 0.5 - raw))  # 0 normal, 1 weird
        return int(normalized * 30)


anomaly_model = AnomalyModel()

# ------------ Risk aggregation ------------

def compute_risk(text: str) -> Dict[str, Any]:
    r_regex = regex_score(text)
    r_entropy = entropy_score(text)
    r_anomaly = anomaly_model.anomaly_score(text)

    total = r_regex + r_entropy + r_anomaly
    # clip to 0–100
    total = max(0, min(100, total))

    if total <= 30:
        action = "pass"
    elif total <= 70:
        action = "sanitize"
    else:
        action = "block"

    return {
        "regex_score": r_regex,
        "entropy_score": r_entropy,
        "anomaly_score": r_anomaly,
        "total_score": total,
        "action": action,
    }


# ------------ Sanitization ------------

BASE64_RE = re.compile(r"[A-Za-z0-9+/=]{40,}")  # crude heuristic


def maybe_decode_base64(text: str) -> str:
    def try_decode(chunk: str) -> str:
        try:
            decoded = base64.b64decode(chunk, validate=True)
            decoded_str = decoded.decode("utf-8", errors="ignore")
            # Only keep if it looks like readable text
            if sum(ch.isprintable() for ch in decoded_str) / max(
                1, len(decoded_str)
            ) > 0.8:
                return decoded_str
            return chunk
        except Exception:
            return chunk

    def replace_chunk(match):
        return try_decode(match.group(0))

    return BASE64_RE.sub(replace_chunk, text)


DANGEROUS_STRINGS = [
    "ignore previous instructions",
    "ignore all previous instructions",
    "[SYSTEM]",
    "reveal the system prompt",
    "reveal system prompt",
    "override safety",
]

def sanitize_text(text: str) -> str:
    # 1) Decode obvious base64-ish payloads
    text = maybe_decode_base64(text)

    # 2) Strip dangerous phrases
    lowered = text.lower()
    for bad in DANGEROUS_STRINGS:
        lowered = lowered.replace(bad, "[REMOVED]")
    # preserve original casing in a simple way:
    # map lowered back to text length
    # (for demo simplicity, just return lowered with placeholders)
    sanitized = lowered

    # 3) Normalize whitespace
    sanitized = re.sub(r"\s+", " ", sanitized).strip()
    return sanitized
