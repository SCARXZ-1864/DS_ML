import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="border-b border-line pb-4 pt-6">
      <p className="label">{eyebrow}</p>
      <h1 className="mt-1 break-words font-serif text-3xl">{title}</h1>
      {children ? <div className="mt-2 max-w-3xl text-sm text-muted">{children}</div> : null}
    </header>
  );
}
