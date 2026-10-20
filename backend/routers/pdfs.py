"""Chapter PDF library: upload, list, fetch, patch, and delete PDFs."""

import logging
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse

from lib.db import db
from lib.storage import UPLOAD_DIR
from models.teaching import PdfDoc, PdfPatch

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB


def _aware(value: datetime | None) -> datetime:
    """Motor returns naive UTC datetimes; normalise them for API clients."""
    if value is None:
        return datetime.now(timezone.utc)
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


async def _get_doc(pdf_id: str) -> dict:
    doc = await db.pdfs.find_one({"id": pdf_id})
    if not doc:
        raise HTTPException(status_code=404, detail="PDF not found")
    return doc


def _to_model(document: dict) -> PdfDoc:
    # Do not mutate the object returned by the database cursor.
    data = {key: value for key, value in document.items() if key != "_id"}
    data["created_at"] = _aware(data.get("created_at"))
    return PdfDoc(**data)


@router.post("/pdfs", response_model=PdfDoc, status_code=201)
async def upload_pdf(file: UploadFile):
    """Store a validated PDF and its metadata."""
    try:
        data = await file.read(MAX_UPLOAD_BYTES + 1)
        if len(data) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="PDF is larger than 25 MB")
        if not data.startswith(b"%PDF"):
            raise HTTPException(status_code=400, detail="That file is not a valid PDF")

        doc = PdfDoc(
            filename=(file.filename or "chapter.pdf").replace("\\", "/").split("/")[-1],
            size_bytes=len(data),
        )
        path = UPLOAD_DIR / f"{doc.id}.pdf"
        path.write_bytes(data)
        try:
            await db.pdfs.insert_one(doc.model_dump())
        except Exception:
            path.unlink(missing_ok=True)
            raise
        return doc
    finally:
        await file.close()


@router.get("/pdfs", response_model=List[PdfDoc])
async def list_pdfs():
    docs = await db.pdfs.find().sort("created_at", -1).to_list(500)
    return [_to_model(document) for document in docs]


@router.get("/pdfs/{pdf_id}", response_model=PdfDoc)
async def get_pdf(pdf_id: str):
    return _to_model(await _get_doc(pdf_id))


@router.get("/pdfs/{pdf_id}/file")
async def get_pdf_file(pdf_id: str):
    doc = await _get_doc(pdf_id)
    path = UPLOAD_DIR / f"{pdf_id}.pdf"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="PDF file missing on disk")
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=doc.get("filename", "chapter.pdf"),
        content_disposition_type="inline",
    )


@router.patch("/pdfs/{pdf_id}", response_model=PdfDoc)
async def patch_pdf(pdf_id: str, patch: PdfPatch):
    await _get_doc(pdf_id)
    update = patch.model_dump(exclude_unset=True, exclude_none=True)
    if update:
        await db.pdfs.update_one({"id": pdf_id}, {"$set": update})
    return _to_model(await _get_doc(pdf_id))


@router.delete("/pdfs/{pdf_id}", status_code=200)
async def delete_pdf(pdf_id: str):
    await _get_doc(pdf_id)
    await db.pdfs.delete_one({"id": pdf_id})
    (UPLOAD_DIR / f"{pdf_id}.pdf").unlink(missing_ok=True)
    return {"ok": True, "id": pdf_id}
