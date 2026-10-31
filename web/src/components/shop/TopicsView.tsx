"use client";

import { useMemo, useState } from "react";
import { Sparkline } from "@/components/charts/Sparkline";
import { TopicBubbles } from "@/components/charts/TopicBubbles";
import type { Review, Shop, Topic } from "@/lib/data/schemas";
import { fmtInt } from "@/lib/format";
import { PageHeader } from "./PageHeader";
import { ReviewCard } from "./ReviewCard";

const FILTERS = [
  { key: "all", label: "All topics", test: () => true },
  { key: "complaints", label: "Mostly complaints", test: (t: Topic) => t.negShare >= 0.5 },
  { key: "praise", label: "Mostly praise", test: (t: Topic) => t.negShare <= 0.25 },
] as const;

type Props = { shop: Shop; topics: Topic[]; reviews: Review[] };

export function TopicsView({ shop, topics, reviews }: Props) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(topics[0]?.id ?? null);
  const test = FILTERS.find((f) => f.key === filter)!.test;
  const visibleIds = useMemo(() => new Set(topics.filter(test).map((t) => t.id)), [topics, test]);
  const selected = topics.find((t) => t.id === selectedId) ?? null;
  const reviewById = useMemo(() => new Map(reviews.map((r) => [r.id, r])), [reviews]);
  const aspectNames = useMemo(() => Object.fromEntries(topics.map((t) => [t.id.replace(/^t-/, ""), t.label.split(":")[0]])), [topics]);

  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow={`${shop.name} · topics`} title="What customers talk about">
        Each bubble is a theme found in the reviews. Bigger means more reviews; redder means more complaints.
      </PageHeader>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter topics">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className="border border-line bg-panel px-3 py-1 text-sm hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-bg"
          >
            {f.label}
          </button>
        ))}
      </div>

      {topics.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No topics found yet. Upload reviews to discover them.</p>
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <TopicBubbles topics={topics} visibleIds={visibleIds} selectedId={selectedId} onSelect={setSelectedId} />
            {visibleIds.size === 0 && <p className="text-sm text-muted">No topics match this filter.</p>}
          </div>
          {selected && (
            <section className="border border-line bg-panel p-5" aria-labelledby="topic-title">
              <p className="label">{fmtInt(selected.size)} reviews</p>
              <h2 id="topic-title" className="mt-1 break-words font-serif text-2xl">{selected.label}</h2>
              <p className="mt-1 font-mono text-sm">
                {/* negShare ignores neutral mentions, so say exactly that instead of a positive % that
                    would contradict the Aspects page (which counts neutral mentions too). */}
                <span className="text-neg">{Math.round(selected.negShare * 100)}% of opinions are negative</span>
                <span className="text-muted"> (neutral mentions not counted)</span>
              </p>
              <ul className="mt-3 flex list-none flex-wrap gap-1.5 p-0" aria-label="Keywords">
                {selected.keywords.map((k) => (
                  <li key={k} className="border border-line px-1.5 font-mono text-xs">{k}</li>
                ))}
              </ul>
              <p className="label mt-4">Mentions per month</p>
              <Sparkline values={selected.monthly.map((m) => m.count)} tone={selected.negShare >= 0.5 ? "negative" : "positive"} />
              <p className="label mt-4">Representative reviews</p>
              {selected.representativeReviewIds
                .map((id) => reviewById.get(id))
                .filter((r): r is Review => Boolean(r))
                .map((r) => (
                  <ReviewCard key={r.id} review={r} aspectNames={aspectNames} />
                ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
