"""Shared asynchronous MongoDB client and database handle."""

import os

from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "kathapath")

client = AsyncIOMotorClient(MONGODB_URL)
db = client[MONGODB_DATABASE]
