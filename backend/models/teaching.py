"""Pydantic v2 models for the teaching app.

Each model here is mirrored by a hand-written TS interface in
src/lib/api.ts — keep the two in sync in the same edit.
"""

from datetime import datetime, timezone
from typing import List
from uuid import uuid4

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class PdfDoc(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    filename: str
    size_bytes: int = 0
    page_count: int = 0
    is_sample: bool = False
    created_at: datetime = Field(default_factory=utcnow)


class PdfPatch(BaseModel):
    page_count: int | None = None


class OcrWord(BaseModel):
    text: str
    x: int
    y: int
    w: int
    h: int


class OcrRequest(BaseModel):
    page_index: int
    image: str  # base64 (or data-URL) jpeg/png of one rendered PDF page


class OcrResponse(BaseModel):
    page_index: int
    width: int
    height: int
    words: List[OcrWord]


class VocabItem(BaseModel):
    word: str
    hindi: str


class SentenceExplanation(BaseModel):
    index: int
    hindi: str = ""
    vocab: List[VocabItem] = Field(default_factory=list)


class ExplainRequest(BaseModel):
    sentences: List[str] = Field(min_length=1, max_length=16)


class ExplainResponse(BaseModel):
    items: List[SentenceExplanation]
