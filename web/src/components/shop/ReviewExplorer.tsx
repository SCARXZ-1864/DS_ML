"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Aspect, ReviewPage, ReviewSort, Tone } from "@/lib/data/schemas";
import { fmtInt } from "@/lib/format";
import { ReviewCard } from "./ReviewCard";

const SENTIMENTS: { value: Tone | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
];
const SORTS: { value: ReviewSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "lowest", label: "Lowest stars" },
  { value: "highest", label: "Highest stars" },
];

type Filters = { sentiment?: Tone; aspectId: string; sort: ReviewSort; search: string };
const DEFAULT_FILTERS: Filters = { aspectId: "", sort: "newest", search: "" };

async function fetchReviews(shopId: string, f: Filters, cursor: string | null, signal: AbortSignal): Promise<ReviewPage> {
  const params = new URLSearchParams();
  if (f.sentiment) params.set("sentiment", f.sentiment);
  if (f.aspectId) params.set("aspectId", f.aspectId);
  if (f.search.trim()) params.set("search", f.search.trim());
  if (f.sort !== "newest") params.set("sort", f.sort);
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`/api/shops/${shopId}/reviews?${params}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

type Props = { shopId: string; aspects: Aspect[]; initial: ReviewPage };

export function ReviewExplorer({ shopId, aspects, initial }: Props) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState<ReviewPage>(initial);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [attempt, setAttempt] = useState(0);
  const isFirstRun = useRef(true);
  // One request at a time: starting a new one (filters or Load more) cancels whatever is in flight.
  const inflight = useRef<AbortController | null>(null);
  const startRequest = () => {
    inflight.current?.abort();
    inflight.current = new AbortController();
    return inflight.current;
  };
  const aspectNames = useMemo(() => Object.fromEntries(aspects.map((a) => [a.id, a.name])), [aspects]);

  // Wait for a pause in typing before searching.
  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => (f.search === searchText ? f : { ...f, search: searchText })), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Refetch page one whenever filters change. Aborting the previous request means
  // a slow, outdated response can never overwrite a newer one.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false; // the server already rendered page one for the default filters
      return;
    }
    const controller = startRequest();
    setStatus("loading");
    fetchReviews(shopId, filters, null, controller.signal)
      .then((next) => {
        setPage(next);
        setStatus("idle");
      })
      .catch((err: unknown) => {
        if ((err as Error).name !== "AbortError") setStatus("error");
      });
    return () => controller.abort();
  }, [shopId, filters, attempt]);

  const loadMore = useCallback(async () => {
    if (!page.nextCursor) return;
    const controller = startRequest();
    setStatus("loading");
    try {
      const next = await fetchReviews(shopId, filters, page.nextCursor, controller.signal);
      setPage((prev) => ({ ...next, items: [...prev.items, ...next.items] }));
      setStatus("idle");
    } catch (err) {
      if ((err as Error).name !== "AbortError") setStatus("error");
    }
  }, [shopId, filters, page.nextCursor]);

  // Cancel any request still running when the explorer unmounts.
  useEffect(() => () => inflight.current?.abort(), []);

  const clearFilters = () => {
    setSearchText("");
    setFilters({ ...DEFAULT_FILTERS });
  };

  const control = "border border-line bg-panel px-3 py-1 text-sm hover:border-accent";

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sentiment">
          {SENTIMENTS.map((s) => (
            <button
              key={s.label}
              type="button"
              aria-pressed={filters.sentiment === s.value}
              onClick={() => setFilters((f) => ({ ...f, sentiment: s.value }))}
              className={`${control} aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-bg`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <select aria-label="Aspect" value={filters.aspectId} onChange={(e) => setFilters((f) => ({ ...f, aspectId: e.target.value }))} className={control}>
          <option value="">All aspects</option>
          {aspects.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <select aria-label="Sort" value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as ReviewSort }))} className={control}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <input
          type="search"
          aria-label="Search reviews"
          placeholder="Search reviews…"
          maxLength={200}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className={`${control} min-w-48 flex-1 placeholder:text-muted focus:border-accent focus:outline-none`}
        />
      </div>

      <p className="mt-3 font-mono text-xs text-muted" aria-live="polite">
        {fmtInt(page.total)} {page.total === 1 ? "review" : "reviews"}
      </p>

      {status === "error" && (
        <div role="alert" className="mt-3 flex items-center gap-3 border border-neg/60 p-3 text-sm">
          <span>Couldn&apos;t load reviews.</span>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="border border-neg px-2 py-0.5 text-neg hover:bg-neg hover:text-bg">
            Retry
          </button>
        </div>
      )}

      {page.items.length === 0 && status !== "loading" ? (
        <div className="mt-6 border border-dashed border-line p-6 text-center">
          <p className="m-0">No reviews match these filters.</p>
          <button type="button" onClick={clearFilters} className="mt-3 border border-accent px-3 py-1 text-sm text-accent hover:bg-accent hover:text-bg">
            Clear filters
          </button>
        </div>
      ) : (
        <MotionConfig reducedMotion="user">
          <ul aria-busy={status === "loading"} className={`m-0 list-none p-0 transition-opacity ${status === "loading" ? "opacity-50" : ""}`}>
            <AnimatePresence initial={false}>
              {page.items.map((r) => (
                <motion.li key={r.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <ReviewCard review={r} aspectNames={aspectNames} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </MotionConfig>
      )}

      {page.nextCursor && (
        <button type="button" onClick={loadMore} disabled={status === "loading"} className={`${control} mt-4 disabled:opacity-50`}>
          Load more
        </button>
      )}
    </div>
  );
}
