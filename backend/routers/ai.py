"""AI-generated spoken Hindi explanations for English sentences.

Explanations are cached per normalised sentence in MongoDB so repeated
requests can reuse existing explanations.
"""

import asyncio
import hashlib
import json
import logging
import os
import uuid

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.teaching import ExplainRequest, ExplainResponse, SentenceExplanation, VocabItem

logger = logging.getLogger(__name__)
router = APIRouter()


def _cache_key(sentence: str) -> str:
    return hashlib.sha1(" ".join(sentence.split()).encode("utf-8")).hexdigest()


def _build_prompt(sentences: list[str]) -> str:
    numbered = "\n".join(f"{i + 1}. {s}" for i, s in enumerate(sentences))
    return (
        "For each numbered English sentence from a school textbook chapter, produce:\n"
        '1. "hindi": a simple spoken-style explanation of the sentence meaning, written '
        "in Hindi (Devanagari), 1–2 short sentences, warm classroom tone. Avoid unnecessary "
        "English words.\n"
        '2. "vocab": up to 3 difficult English words from that sentence, each as '
        '{"word": <the English word exactly as it appears>, '
        '"hindi": <its simple Hindi meaning in Devanagari, 2–6 words>}. Use an empty array '
        "if there are no difficult words.\n"
        "Sentences:\n"
        f"{numbered}\n\n"
        "Reply with ONLY a JSON array, one object per sentence in the same order:\n"
        '[{"hindi": "...", "vocab": [{"word": "...", "hindi": "..."}]}, ...]'
    )


def _parse_items(raw: str, count: int) -> list[dict]:
    text = raw.strip()
    if "```" in text:
        text = max(text.split("```"), key=len).strip()
        if text.lower().startswith("json"):
            text = text[4:].strip()
    start, end = text.find("["), text.rfind("]")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("no JSON array in model response")
    items = json.loads(text[start : end + 1])
    if not isinstance(items, list) or len(items) != count:
        actual = len(items) if isinstance(items, list) else type(items).__name__
        raise ValueError(f"expected {count} explanation objects, got {actual}")
    if any(not isinstance(item, dict) for item in items):
        raise ValueError("every explanation item must be a JSON object")
    return items


async def _llm_explain(sentences: list[str]) -> list[dict]:
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise HTTPException(status_code=503, detail="LLM key is not configured on the server")

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError as exc:
        logger.exception("LLM integration package is not installed")
        raise HTTPException(status_code=503, detail="LLM integration package is not installed") from exc

    chat = (
        LlmChat(
            api_key=key,
            session_id=f"explain-{uuid.uuid4()}",
            system_message=(
                "You are a patient Indian school English teacher helping Hindi-medium students. "
                "Reply with strict JSON only, without markdown fences or commentary."
            ),
        )
        .with_model("anthropic", os.environ.get("KATHAPATH_LLM_MODEL", "claude-sonnet-5-5"))
    )
    prompt = _build_prompt(sentences)
    last_error: Exception | None = None
    for attempt in range(2):
        try:
            raw = await asyncio.wait_for(
                chat.send_message(UserMessage(text=prompt)),
                timeout=240,
            )
            if not isinstance(raw, str):
                raw = getattr(raw, "content", None) or str(raw)
            return _parse_items(raw, len(sentences))
        except HTTPException:
            raise
        except Exception as exc:
            last_error = exc
            logger.warning("Explanation attempt %s failed: %s", attempt + 1, exc)
    raise HTTPException(status_code=502, detail=f"Hindi explanation engine failed: {last_error}")


@router.post("/explain", response_model=ExplainResponse)
async def explain(req: ExplainRequest):
    sentences = [" ".join(sentence.split()) for sentence in req.sentences]
    results: list[SentenceExplanation | None] = [None] * len(sentences)
    missing: list[int] = []

    for index, sentence in enumerate(sentences):
        doc = await db.explanations.find_one({"key": _cache_key(sentence)})
        if doc:
            results[index] = SentenceExplanation(
                index=index,
                hindi=doc.get("hindi", ""),
                vocab=[
                    VocabItem(**item)
                    for item in doc.get("vocab", [])
                    if isinstance(item, dict) and item.get("word") and item.get("hindi")
                ],
            )
        else:
            missing.append(index)

    if missing:
        generated = await _llm_explain([sentences[index] for index in missing])
        for generated_index, sentence_index in enumerate(missing):
            item = generated[generated_index]
            hindi = str(item.get("hindi", "") or "").strip()
            vocab: list[VocabItem] = []
            raw_vocab = item.get("vocab") or []
            if isinstance(raw_vocab, list):
                for entry in raw_vocab[:3]:
                    if isinstance(entry, dict) and entry.get("word") and entry.get("hindi"):
                        vocab.append(
                            VocabItem(
                                word=str(entry["word"]).strip(),
                                hindi=str(entry["hindi"]).strip(),
                            )
                        )

            results[sentence_index] = SentenceExplanation(
                index=sentence_index,
                hindi=hindi,
                vocab=vocab,
            )
            key = _cache_key(sentences[sentence_index])
            await db.explanations.update_one(
                {"key": key},
                {
                    "$set": {
                        "key": key,
                        "sentence": sentences[sentence_index],
                        "hindi": hindi,
                        "vocab": [vocab_item.model_dump() for vocab_item in vocab],
                    }
                },
                upsert=True,
            )

    return ExplainResponse(items=[item for item in results if item is not None])
