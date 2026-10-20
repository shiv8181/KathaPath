"""Shared asynchronous MongoDB client, database handle, and indexes."""

import os

from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "kathapath")

client = AsyncIOMotorClient(MONGODB_URL)
db = client[MONGODB_DATABASE]


async def ensure_indexes() -> None:
    """Create indexes used by PDF and explanation lookup paths."""
    await db.pdfs.create_index("id", unique=True)
    await db.pdfs.create_index("created_at")
    await db.explanations.create_index("key", unique=True)
