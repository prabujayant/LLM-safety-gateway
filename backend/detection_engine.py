# backend/detection_engine.py
import math
import re
import base64
from typing import Dict, Any, List, Tuple

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
    r"\bforget (the )?guardrails\b",
    r"\babandon (all )?safety (checks|filters)\b",
    r"\bbreak (the )?content policy\b",
]

regex_compiled = [re.compile(pat, re.IGNORECASE) for pat in INJECTION_PATTERNS]

# ------------ 2. Keyword heuristics ------------

SUSPICIOUS_KEYWORDS = [
    "system prompt",
    "developer mode",
    "god mode",
    "jailbreak",
    "prompt injection",
    "override safety",
    "hidden policy",
    "ignore the rules",
    "break the guardrails",
    "bypass logging",
    "exfiltrate",
    "payload",
    "obfuscate",
    "content policy",
]

DANGEROUS_COMMANDS = [
    "rm -rf",
    "curl",
    "wget",
    "powershell",
    "cmd.exe",
    "invoke-webrequest",
    "chmod 777",
    "base64 -d",
    "python -c",
    "sudo",
]

WORD_RE = re.compile(r"[a-z0-9']+")
CODE_MARKERS = ["```", "<script", "<?", "powershell", "cmd.exe", "eval(", "$(", "curl"]
DIRECTIVE_CUES = [
    "ignore",
    "disregard",
    "forget",
    "pretend",
    "act as",
    "reveal",
    "dump",
    "disable",
    "remove",
    "bypass",
    "override",
]


def evaluate_regex(text: str) -> Tuple[int, List[str]]:
    """
    Returns (score, list_of_matches).
    Score: 0-40 based on number/strength of matches.
    """
    matches: List[str] = []
    for pattern in regex_compiled:
        match = pattern.search(text)
        if match:
            matches.append(match.group(0))
    count = len(matches)
    score = 0
    if count == 1:
        score = 25
    elif count == 2:
        score = 35
    elif count >= 3:
        score = 40
    return score, matches


def regex_score(text: str) -> int:
    """Returns 0-40 based on number/strength of matches (backward compat)."""
    score, _ = evaluate_regex(text)
    return score


def keyword_signal(text: str) -> Tuple[int, List[str]]:
    """Detect suspicious keywords and return score + hits."""
    lowered = text.lower()
    hits: List[str] = []
    for phrase in SUSPICIOUS_KEYWORDS + DANGEROUS_COMMANDS:
        if phrase.lower() in lowered:
            hits.append(phrase)
    unique_hits = sorted(set(hits))
    score = min(20, 5 * len(unique_hits))
    return score, unique_hits


# ------------ 3. Entropy analysis (detect encoding/obfuscation) ------------

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


def entropy_signal(text: str) -> Tuple[int, float]:
    """
    Map entropy to a 0-30 risk bucket.
    Returns (score, entropy_value).
    - normal English usually ~3.5–4.0 bits/char
    - base64/obfuscated ~4.5–5.5+
    """
    ent = shannon_entropy(text)
    if ent < 3.7:
        return 0, ent
    elif ent < 4.3:
        return 10, ent
    elif ent < 4.8:
        return 20, ent
    else:
        return 30, ent


def entropy_score(text: str) -> int:
    """Returns 0-30 entropy risk (backward compat)."""
    score, _ = entropy_signal(text)
    return score


# ------------ 4. Lightweight anomaly detection (IsolationForest) ------------

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
    """
    Comprehensive risk assessment combining multiple signals.
    Returns dict with scores, action, insights, and indicators for frontend display.
    """
    insights: List[str] = []
    indicators: List[str] = []

    # Regex analysis
    r_regex, regex_hits = evaluate_regex(text)
    if regex_hits:
        insights.append(f"Direct injection cues: {', '.join(regex_hits[:3])}")
        indicators.extend(regex_hits)

    # Entropy analysis
    r_entropy, entropy_val = entropy_signal(text)
    if r_entropy >= 20:
        insights.append(f"High entropy payload ({entropy_val:.2f} bits/char)")

    # Keyword analysis
    r_keyword, keyword_hits = keyword_signal(text)
    if keyword_hits:
        insights.append(f"Suspicious keywords: {', '.join(keyword_hits[:4])}")
        indicators.extend(keyword_hits)

    # Anomaly detection
    r_anomaly = anomaly_model.anomaly_score(text)
    if r_anomaly >= 20:
        insights.append("Structural anomaly detected by ML layer")

    total = r_regex + r_entropy + r_keyword + r_anomaly
    # clip to 0–100
    total = max(0, min(100, total))

    if total <= 30:
        action = "pass"
    elif total <= 70:
        action = "sanitize"
    else:
        action = "block"

    insights = insights[:5]
    deduped_indicators = sorted(set(indicators))[:8]

    return {
        "regex_score": r_regex,
        "entropy_score": r_entropy,
        "keyword_score": r_keyword,
        "anomaly_score": r_anomaly,
        "total_score": total,
        "action": action,
        "insights": insights,
        "indicators": deduped_indicators,
    }


# ------------ Sanitization ------------

BASE64_RE = re.compile(r"[A-Za-z0-9+/=]{40,}")  # crude heuristic
CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def maybe_decode_base64(text: str) -> Tuple[str, List[str]]:
    """
    Decode obvious base64-ish payloads.
    Returns (decoded_text, list_of_operations).
    """
    operations: List[str] = []

    def try_decode(chunk: str) -> str:
        try:
            decoded = base64.b64decode(chunk, validate=True)
            decoded_str = decoded.decode("utf-8", errors="ignore")
            # Only keep if it looks like readable text
            if sum(ch.isprintable() for ch in decoded_str) / max(
                1, len(decoded_str)
            ) > 0.8:
                operations.append("Decoded base64 payload")
                return decoded_str
            return chunk
        except Exception:
            return chunk

    def replace_chunk(match):
        return try_decode(match.group(0))

    decoded_text = BASE64_RE.sub(replace_chunk, text)
    return decoded_text, operations


DANGEROUS_STRINGS = [
    "ignore previous instructions",
    "ignore all previous instructions",
    "[SYSTEM]",
    "reveal the system prompt",
    "reveal system prompt",
    "override safety",
    "forget the guardrails",
    "abandon safety",
    "developer mode",
    "system prompt",
    "break the content policy",
]


def sanitize_text(text: str) -> Dict[str, Any]:
    """
    Sanitize dangerous content and track operations.
    Returns dict with sanitized text and operations performed.
    """
    operations: List[str] = []
    
    # 1) Decode obvious base64-ish payloads
    sanitized, decode_ops = maybe_decode_base64(text)
    operations.extend(decode_ops)

    # 2) Remove control characters
    original = sanitized
    sanitized = CONTROL_CHAR_RE.sub("", sanitized)
    if sanitized != original:
        operations.append("Removed control characters")

    # 3) Strip dangerous phrases
    for phrase in DANGEROUS_STRINGS:
        pattern = re.compile(re.escape(phrase), re.IGNORECASE)
        if pattern.search(sanitized):
            sanitized = pattern.sub("[REMOVED]", sanitized)
            operations.append(f"Redacted '{phrase}'")

    # 4) Normalize whitespace
    collapsed = re.sub(r"\s+", " ", sanitized).strip()
    if collapsed != sanitized:
        operations.append("Normalized whitespace")
    sanitized = collapsed

    return {
        "text": sanitized,
        "operations": operations,
    }
