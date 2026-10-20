import type { ReactNode } from 'react';

export default function AppShell({ children }: { children: ReactNode }) {
  return <div className="app-shell" data-testid="app-shell">{children}</div>;
}
