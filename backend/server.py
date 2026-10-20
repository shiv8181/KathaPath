"""FastAPI application entry point for KathaPath."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from lib.db import client
from routers import ai, ocr, pdfs


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    client.close()


app = FastAPI(
    title="KathaPath API",
    description="PDF library, OCR, and reading-tutor services for KathaPath.",
    version="0.1.0",
    lifespan=lifespan,
)

_allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "KATHAPATH_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(pdfs.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(ocr.router, prefix="/api")


@app.get("/health")
async def health():
    return {"ok": True, "service": "kathapath-api"}
