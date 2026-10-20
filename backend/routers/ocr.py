"""OCR endpoint for a rendered PDF page image."""

import base64
import binascii
import io
import re

import pytesseract
from fastapi import APIRouter, HTTPException
from PIL import Image, UnidentifiedImageError
from pytesseract import Output

from models.teaching import OcrRequest, OcrResponse, OcrWord

router = APIRouter()


def _decode_image(value: str) -> bytes:
    """Accept plain base64 or a base64 data URL."""
    payload = value.strip()
    if payload.startswith("data:"):
        header, separator, payload = payload.partition(",")
        if not separator or ";base64" not in header.lower():
            raise HTTPException(status_code=400, detail="Image data URL must use base64 encoding")
    payload = re.sub(r"\s+", "", payload)
    try:
        return base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Image is not valid base64 data") from exc


@router.post("/ocr", response_model=OcrResponse)
async def recognize_page(req: OcrRequest):
    if req.page_index < 0:
        raise HTTPException(status_code=422, detail="page_index must be zero or greater")

    image_bytes = _decode_image(req.image)
    if len(image_bytes) > 12 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Rendered page image exceeds 12 MB")

    try:
        with Image.open(io.BytesIO(image_bytes)) as source:
            image = source.convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=400, detail="Could not decode the page image") from exc

    try:
        data = pytesseract.image_to_data(image, output_type=Output.DICT)
    except pytesseract.TesseractNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail="Tesseract OCR is not installed or is not available on the server PATH",
        ) from exc
    except pytesseract.TesseractError as exc:
        raise HTTPException(status_code=502, detail="Tesseract could not process this page") from exc

    words: list[OcrWord] = []
    for index, raw_text in enumerate(data.get("text", [])):
        word = str(raw_text).strip()
        if not word:
            continue
        try:
            confidence = float(data.get("conf", ["-1"])[index])
        except (ValueError, TypeError, IndexError):
            confidence = -1
        if confidence < 0:
            continue
        words.append(
            OcrWord(
                text=word,
                x=int(data["left"][index]),
                y=int(data["top"][index]),
                w=int(data["width"][index]),
                h=int(data["height"][index]),
            )
        )

    return OcrResponse(
        page_index=req.page_index,
        width=image.width,
        height=image.height,
        words=words,
    )
