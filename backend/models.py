# backend/models.py
from typing import Optional, Literal, List
from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    prompt: str


class LayerScores(BaseModel):
    regex_score: int
    entropy_score: int
    anomaly_score: int
    total_score: int
    action: Literal["pass", "sanitize", "block"]


class AnalyzeResponse(BaseModel):
    scores: LayerScores
    raw_prompt: str
    sanitized_prompt: str
    wrapped_prompt: Optional[str]
    ppa_template_id: Optional[str]
    processing_ms: float
    llm_response: Optional[str] = None  # Auto-filled when action is "pass"


class AttackLogItem(BaseModel):
    id: int
    timestamp: str
    action: str
    total_score: int
    processing_ms: float
    regex_score: int
    entropy_score: int
    anomaly_score: int
    ppa_template_id: Optional[str]
    raw_prompt: str
    sanitized_prompt: str
    wrapped_prompt: str


class AttackHistoryResponse(BaseModel):
    items: List[AttackLogItem]
