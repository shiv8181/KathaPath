"""Local storage paths for uploaded KathaPath documents."""

import os
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parents[1]
UPLOAD_DIR = Path(os.getenv("KATHAPATH_UPLOAD_DIR", str(_BACKEND_DIR / "uploads"))).resolve()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
