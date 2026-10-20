# KathaPath — AI PDF English & Hindi Verbal Tutor

KathaPath is a textbook-inspired reading companion for English learners. Its central rule is **Hindi learning support is audio-only; Hindi text is never rendered in the UI or over the PDF**.

## Frontend

- React 18, TypeScript, Vite, and PDF.js.
- Reusable speech and PDF hooks in `src/hooks/`.
- Original PDF page rendering with page navigation.
- Text extraction for selectable-text PDFs and an OCR fallback request for scanned PDFs.
- Browser speech synthesis, sentence-by-sentence reading, best-effort word highlighting, playback controls, speed and voice selection.
- Sentence-level spoken Hindi explanations through the FastAPI `POST /api/explain` endpoint.
- PDF upload and saved-library API client in `src/lib/http.ts`.
- Responsive cream, forest-green, and amber design system.

### Run the frontend

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` in the frontend `.env` to the public base URL of the FastAPI service (for local development, `http://localhost:8000`). **Never place the LLM API key in the frontend environment.** It belongs only in the backend's private environment.

Build and preview:

```bash
npm run build
npm run preview
```

## Backend

The FastAPI service exposes:
- `GET /health`
- `POST /api/pdfs`, `GET /api/pdfs`, `GET /api/pdfs/{id}`, `GET /api/pdfs/{id}/file`, `PATCH /api/pdfs/{id}`, `DELETE /api/pdfs/{id}`
- `POST /api/explain` for generated Hindi explanation and vocabulary
- `POST /api/ocr` for OCR of a rendered PDF page

Requirements: Python 3.11+, MongoDB, and Tesseract installed on the backend host for OCR.

```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn server:app --reload --port 8000
```

Set `MONGODB_URL`, `MONGODB_DATABASE`, `KATHAPATH_CORS_ORIGINS`, and optionally `KATHAPATH_UPLOAD_DIR`. Set `EMERGENT_LLM_KEY` only in the backend's private `.env` file. Do not commit secrets.

### Seed sample PDFs

After MongoDB and backend dependencies are configured:

```bash
cd backend
python seed.py
```

## Current integration notes

- PDF upload attempts to save the document to the backend; local PDF reading continues if backend sync is unavailable.
- Scanned PDF OCR currently extracts the first page to establish the reading text. Full multi-page OCR and OCR-word alignment are follow-up improvements.
- Original PDF pages are rendered as PDF.js canvases. Speech-word highlighting currently applies to the sample text reader; exact overlay alignment of spoken words on arbitrary PDF page layouts is still a follow-up.
- Speech boundary events and available English/Hindi voices depend on the browser and operating system. Test on the target devices before production.
- A frontend production build and live API test still need to be run in the target environment.
