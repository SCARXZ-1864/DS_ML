"use client";

import { useEffect } from "react";

// Next.js 16 passes `retry` (not `reset`) to error boundaries.
export default function ShopError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="py-24">
      <h1 className="font-serif text-2xl">Couldn&apos;t load this page</h1>
      <p className="mt-2 text-muted">Something went wrong while loading the shop data.</p>
      <button type="button" onClick={() => retry()} className="mt-6 border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent hover:text-bg">
        Retry
      </button>
    </div>
  );
}
