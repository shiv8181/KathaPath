/** Hand-written TypeScript mirrors of the Pydantic models in backend/models/teaching.py. */

export interface PdfDoc {
  id: string;
  filename: string;
  size_bytes: number;
  page_count: number;
  is_sample: boolean;
  created_at: string;
}

export interface PdfPatch {
  page_count?: number | null;
}

export interface OcrWord {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OcrRequest {
  page_index: number;
  /** Base64 image bytes or a data URL for one rendered PDF page. */
  image: string;
}

export interface OcrResponse {
  page_index: number;
  width: number;
  height: number;
  words: OcrWord[];
}

export interface VocabItem {
  word: string;
  hindi: string;
}

export interface SentenceExplanation {
  index: number;
  hindi: string;
  vocab: VocabItem[];
}

export interface ExplainRequest {
  /** The API accepts between 1 and 16 sentences. */
  sentences: string[];
}

export interface ExplainResponse {
  items: SentenceExplanation[];
}
