"use client";

import { useEffect, useRef } from "react";
import type { Aspect, Review } from "@/lib/data/schemas";
import { fmtInt, fmtPct } from "@/lib/format";
import { ReviewCard } from "./ReviewCard";

type Props = {
  aspect: Aspect | null;
  reviews: Review[];
  aspectNames: Record<string, string>;
  onClose: () => void;
};

export function AspectDrawer({ aspect, reviews, aspectNames, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  // Open as a modal while an aspect is selected; showModal() traps focus and Esc closes it.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (aspect && !dialog.open) dialog.showModal();
    if (!aspect && dialog.open) dialog.close();
  }, [aspect]);

  const related = aspect ? reviews.filter((r) => r.aspectMentions.some((m) => m.aspectId === aspect.id)) : [];

  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-labelledby="aspect-drawer-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // a click on the backdrop
      }}
    >
      {aspect && (
        <div className="grid gap-3 p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id="aspect-drawer-title" className="m-0 break-words font-serif text-2xl">{aspect.name}</h2>
            <button type="button" onClick={onClose} className="border border-line px-2.5 py-1 text-sm hover:border-accent">
              Close
            </button>
          </div>
          <p className="m-0 font-mono text-sm">
            <span className="text-neg">{fmtPct(aspect.negPct)} negative</span>
            {" · "}
            <span className="text-pos">{fmtPct(aspect.posPct)} positive</span>
            {" · "}
            <span className="text-muted">{fmtInt(aspect.mentions)} mentions</span>
          </p>
          {aspect.isNew && (
            <p className="m-0 w-fit border border-info px-2 py-0.5 text-xs text-info">New: customers only started mentioning this recently</p>
          )}
          <h3 className="label mt-2">What customers said</h3>
          {related.length > 0 ? (
            <div>
              {related.map((r) => (
                <ReviewCard key={r.id} review={r} aspectNames={aspectNames} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No example reviews for this aspect yet.</p>
          )}
        </div>
      )}
    </dialog>
  );
}
