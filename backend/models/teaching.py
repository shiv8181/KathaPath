"""Pydantic models for the KathaPath PDF library."""

from datetime import datetime, timezone
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


class PdfDoc(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid4()))
    filename: str = Field(min_length=1, max_length=255)
    size_bytes: int = Field(ge=1)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    title: str | None = Field(default=None, max_length=255)
    reading_progress: float = Field(default=0.0, ge=0.0, le=1.0)


class PdfPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, max_length=255)
    reading_progress: float | None = Field(default=None, ge=0.0, le=1.0)
