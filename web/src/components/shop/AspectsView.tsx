"use client";

import { useMemo, useState } from "react";
import { AspectBars } from "@/components/charts/AspectBars";
import type { Aspect, Review, Shop } from "@/lib/data/schemas";
import { AspectDrawer } from "./AspectDrawer";
import { PageHeader } from "./PageHeader";

type Props = { shop: Shop; aspects: Aspect[]; reviews: Review[] };

export function AspectsView({ shop, aspects, reviews }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rows = useMemo(
    () =>
      [...aspects]
        .sort((a, b) => b.mentions - a.mentions)
        .map((a) => ({ id: a.id, name: a.name, mentions: a.mentions, posPct: a.posPct, negPct: a.negPct })),
    [aspects],
  );
  const aspectNames = useMemo(() => Object.fromEntries(aspects.map((a) => [a.id, a.name])), [aspects]);
  const selected = aspects.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow={`${shop.name} · aspects`} title="What customers rate this shop on">
        These were discovered from the reviews. Select an aspect to read what customers actually wrote.
      </PageHeader>
      <section className="mt-6 max-w-3xl" aria-label="Aspect sentiment">
        {rows.length > 0 ? (
          <AspectBars rows={rows} onSelect={setSelectedId} />
        ) : (
          <p className="text-sm text-muted">No aspects found yet. Upload reviews to discover what customers talk about.</p>
        )}
      </section>
      <AspectDrawer aspect={selected} reviews={reviews} aspectNames={aspectNames} onClose={() => setSelectedId(null)} />
    </div>
  );
}
