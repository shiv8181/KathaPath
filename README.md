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
