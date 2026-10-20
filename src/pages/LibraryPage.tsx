import type { ReactNode } from 'react';

export default function LibraryPage({ children }: { children: ReactNode }) {
  return <aside className="library-panel panel" aria-label="Chapter library" data-testid="library-page">{children}</aside>;
}
