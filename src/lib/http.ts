import type { ExplainResponse, OcrResponse, PdfDoc } from './api';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new Error('Cannot reach the KathaPath backend. Check that the API is running and VITE_API_BASE_URL is correct.');
  }
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body.detail === 'string') detail = body.detail;
    } catch { /* Keep the HTTP fallback. */ }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}

export const api = {
  listPdfs: () => request<PdfDoc[]>('/api/pdfs'),
  uploadPdf: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<PdfDoc>('/api/pdfs', { method: 'POST', body: form });
  },
  getPdfUrl: (id: string) => `${API_BASE}/api/pdfs/${encodeURIComponent(id)}/file`,
  deletePdf: (id: string) => request<{ ok: boolean; id: string }>(`/api/pdfs/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  explain: (sentences: string[]) => request<ExplainResponse>('/api/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sentences }),
  }),
  ocr: (pageIndex: number, image: string) => request<OcrResponse>('/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page_index: pageIndex, image }),
  }),
};

export { API_BASE };
