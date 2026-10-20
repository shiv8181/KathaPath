"""Shared asynchronous MongoDB client, database handle, and index definitions."""

import os

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "kathapath")

client = AsyncIOMotorClient(MONGODB_URL)
db = client[MONGODB_DATABASE]

INDEXES: dict[str, list[IndexModel]] = {
    "status_checks": [
        IndexModel([("timestamp", DESCENDING)], name="timestamp_desc"),
    ],
    "pdfs": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("created_at", DESCENDING)], name="created_at_desc"),
    ],
    "explanations": [
        IndexModel([("key", ASCENDING)], name="key", unique=True),
    ],
}


async def ensure_indexes() -> None:
    """Create the declared indexes for each collection."""
    for collection_name, indexes in INDEXES.items():
        await db[collection_name].create_indexes(indexes)
