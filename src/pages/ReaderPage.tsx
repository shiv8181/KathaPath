import type { ReactNode } from 'react';

export default function ReaderPage({ children }: { children: ReactNode }) {
  return <section className="reader-column" aria-label="PDF reader" data-testid="reader-page">{children}</section>;
}
