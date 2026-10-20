# KathaPath — AI PDF English & Hindi Verbal Tutor

KathaPath is a warm, textbook-inspired reading companion for English learners. It is based on the supplied project blueprint and follows its key rule: **Hindi learning support should be spoken audio only; Hindi text must not be rendered in the app UI or over the PDF.**

## Current MVP

- Responsive study-library interface and four sample stories.
- PDF upload validation (25 MB maximum).
- Browser-side PDF text extraction with PDF.js for text-based PDFs.
- English text-to-speech using the browser Web Speech API.
- Sentence-by-sentence reading with best-effort word highlighting from speech boundary events.
- Playback, previous/next sentence, restart, speed controls and voice selection.
- Spoken explanation for sample stories when a Hindi speech voice is available.
- Accessible labels and the cream/forest-green/amber design direction from the project blueprint.

## Known limitations in this first stage

- PDF text is displayed in a readable text view, not yet rendered in the original PDF page layout.
- Scanned/image-only PDFs need the planned OCR backend; they currently show a helpful notice.
- Hindi voice availability depends on the browser/device. Sample explanations currently use the browser speech synthesizer; a dedicated translation service and robust Hindi narration pipeline are not yet integrated.
- Browser speech boundary events vary by voice and platform, so word highlighting is best-effort and needs cross-browser testing.
- The FastAPI/MongoDB backend and persistent library are planned next; uploaded PDF text is currently held in browser memory.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
npm run preview
```

## Project direction

The supplied blueprint calls for a React + TypeScript frontend, FastAPI/Python backend, MongoDB metadata storage, PDF.js rendering and text coordinates, PyMuPDF/Tesseract OCR fallback, spoken English followed by a short pause and spoken Hindi explanation, and the warm study-library design system. Implement those pieces incrementally and test each stage before calling it complete.


## Backend API (first stage)

The FastAPI backend now has a PDF metadata/file library: upload, list, fetch metadata, fetch the PDF file, patch title/progress, and delete. MongoDB stores metadata; the PDF bytes are saved in the configured upload directory.

Requirements: Python 3.11+ and a running MongoDB instance. Tesseract and PyMuPDF are included in the dependency list for the upcoming OCR endpoint, but **the OCR endpoint itself is not implemented yet**.

```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn server:app --reload --port 8000
```

API documentation is available at `http://localhost:8000/docs` after the server starts. The frontend currently processes PDF text in the browser; connecting its upload/library flow to these backend endpoints is a follow-up task.

Set `MONGODB_URL`, `MONGODB_DATABASE`, `KATHAPATH_CORS_ORIGINS`, and optionally `KATHAPATH_UPLOAD_DIR` for your environment. Do not commit real secrets or production credentials.


### Seed the sample-story library

After installing backend dependencies, starting MongoDB, and configuring `.env`, run:

```bash
cd backend
python seed.py
```

This creates four sample-story PDF files in the configured upload directory and upserts their metadata into MongoDB. Existing generated PDFs are reused rather than overwritten. The script uses PyMuPDF to record the actual page count.

### Hindi explanation service

The backend exposes `POST /api/explain` for sentence-level Hindi explanations and vocabulary. Configure `EMERGENT_LLM_KEY` in the backend's local `.env` file before calling it. The key must remain server-side and must never be committed. Explanation results are cached in MongoDB. This endpoint is not yet wired into the frontend UI.
