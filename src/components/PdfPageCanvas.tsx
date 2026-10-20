import { ChevronLeft, ChevronRight, FileText, LoaderCircle } from 'lucide-react';
import type { RefObject } from 'react';

type Props = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  pageNumber: number;
  pageCount: number;
  loading: boolean;
  onPageChange: (page: number) => void;
};
export default function PdfPageCanvas({ canvasRef, pageNumber, pageCount, loading, onPageChange }: Props) {
  return <div className="reader-card panel pdf-original-card" data-testid="pdf-canvas-container">
    <div className="paper-toolbar">
      <span><FileText size={15}/> ORIGINAL PDF PAGE</span>
      <span className="page-label" data-testid="pdf-page-indicator">PAGE {pageCount ? pageNumber : 0} / {pageCount}</span>
    </div>
    <div className="pdf-canvas-wrap">
      {loading && <div className="pdf-loading"><LoaderCircle size={19} className="spin"/> Loading PDF…</div>}
      <canvas ref={canvasRef} className="pdf-page-canvas" aria-label={`PDF page ${pageNumber}`} />
      {!pageCount && !loading && <p className="pdf-empty">Choose a sample reading or upload a PDF.</p>}
    </div>
    <div className="paper-footer">
      <button className="page-nav" disabled={pageNumber <= 1} onClick={() => onPageChange(pageNumber - 1)}><ChevronLeft size={15}/> Previous</button>
      <span>ORIGINAL LAYOUT · PDF.JS</span>
      <button className="page-nav" disabled={!pageCount || pageNumber >= pageCount} onClick={() => onPageChange(pageNumber + 1)}>Next <ChevronRight size={15}/></button>
    </div>
  </div>;
}
