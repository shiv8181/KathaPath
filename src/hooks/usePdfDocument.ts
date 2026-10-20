import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { api } from '../lib/http';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export type PdfPageInfo = { pageNumber: number; width: number; height: number };
export function usePdfDocument() {
  const [fileName, setFileName] = useState('');
  const [text, setText] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInfo, setPageInfo] = useState<PdfPageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [error, setError] = useState('');
  const [isScanned, setIsScanned] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadingTaskRef = useRef<pdfjsLib.PDFDocumentLoadingTask | null>(null);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const objectUrlRef = useRef('');

  const openFile = useCallback(async (file: File, saveToServer = true) => {
    if (file.size > 25 * 1024 * 1024) throw new Error('This PDF is larger than the 25 MB upload limit.');
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) throw new Error('Please choose a PDF file.');
    setLoading(true); setError(''); setIsScanned(false);
    try {
      let remoteUrl = '';
      if (saveToServer) {
        try {
          const saved = await api.uploadPdf(file);
          remoteUrl = api.getPdfUrl(saved.id);
        } catch (apiError) {
          // Local reading remains available if the API is not configured or reachable.
          setError(apiError instanceof Error ? `Opened locally; library sync unavailable. ${apiError.message}` : 'Opened locally; library sync unavailable.');
        }
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const task = pdfjsLib.getDocument({ data: bytes });
      loadingTaskRef.current = task;
      const pdf = await task.promise;
      pdfRef.current = pdf;
      const pageTexts: string[] = [];
      for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
        const page = await pdf.getPage(pageNo);
        const content = await page.getTextContent();
        const items = content.items.filter((item): item is typeof item & { str: string; transform: number[]; width: number; height: number } => 'str' in item);
        const ordered = items.sort((a,b) => {
          const yDiff = b.transform[5] - a.transform[5];
          return Math.abs(yDiff) > 3 ? yDiff : a.transform[4] - b.transform[4];
        });
        const lines: string[] = [];
        let lastY: number | undefined;
        let line = '';
        for (const item of ordered) {
          const y = item.transform[5];
          if (lastY !== undefined && Math.abs(y - lastY) > 4) {
            if (line.trim()) lines.push(line.trim());
            line = '';
          }
          line += (line && !line.endsWith(' ') ? ' ' : '') + item.str;
          lastY = y;
        }
        if (line.trim()) lines.push(line.trim());
        if (lines.length) pageTexts.push(lines.join(' '));
      }
      const extracted = pageTexts.join('\n\n').replace(/\s+/g, ' ').trim();
      setFileName(file.name.replace(/\.pdf$/i, ''));
      setText(extracted);
      setPageCount(pdf.numPages);
      setPageNumber(1);
      setPdfUrl(remoteUrl);
      setIsScanned(!extracted);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = URL.createObjectURL(file);
      if (!extracted) {
        const first = await pdf.getPage(1);
        const viewport = first.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        await first.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise;
        try {
          const result = await api.ocr(0, canvas.toDataURL('image/png'));
          setText(result.words.map(word => word.text).join(' '));
          setIsScanned(false);
        } catch {
          setError('This looks like a scanned PDF. OCR is unavailable right now; check the backend and Tesseract installation.');
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const renderPage = useCallback(async () => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas || pageNumber < 1 || pageNumber > pdf.numPages) return;
    const page = await pdf.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    const availableWidth = Math.max(280, canvas.parentElement?.clientWidth ?? 720);
    const scale = Math.min(1.6, availableWidth / base.width);
    const viewport = page.getViewport({ scale });
    const context = canvas.getContext('2d');
    if (!context) return;
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    setPageInfo({ pageNumber, width: viewport.width, height: viewport.height });
  }, [pageNumber]);

  useEffect(() => {
    let cancelled = false;
    const render = async () => { if (!cancelled) await renderPage(); };
    void render();
    const observer = typeof ResizeObserver !== 'undefined' && canvasRef.current?.parentElement
      ? new ResizeObserver(() => { if (!cancelled) void renderPage(); }) : null;
    if (observer && canvasRef.current?.parentElement) observer.observe(canvasRef.current.parentElement);
    return () => { cancelled = true; observer?.disconnect(); };
  }, [renderPage, pdfUrl]);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    void loadingTaskRef.current?.destroy();
  }, []);

  const clear = useCallback(() => {
    void pdfRef.current?.destroy();
    pdfRef.current = null;
    setFileName(''); setText(''); setPageCount(0); setPageNumber(1); setPageInfo(null); setPdfUrl(''); setIsScanned(false); setError('');
  }, []);

  return { fileName, text, pageCount, pageNumber, setPageNumber, pageInfo, loading, pdfUrl, error, setError, isScanned, canvasRef, openFile, clear };
}
