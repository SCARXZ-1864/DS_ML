"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ReviewCard } from "@/components/shop/ReviewCard";
import { ChatChunkSchema, type Review } from "@/lib/data/schemas";
import { readNdjson } from "@/lib/ndjson";

type Part = { kind: "text"; text: string } | { kind: "cite"; reviewId: string };
type Turn = { question: string; parts: Part[]; status: "streaming" | "done" | "error"; error?: string };

const WAKING_AFTER_MS = 1500;

type Props = { shopId: string; suggestions: string[]; reviews: Review[]; aspectNames: Record<string, string> };

export function ChatPanel({ shopId, suggestions, reviews, aspectNames }: Props) {
  const [turn, setTurn] = useState<Turn | null>(null);
  const [input, setInput] = useState("");
  const [waking, setWaking] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const reviewById = useMemo(() => new Map(reviews.map((r) => [r.id, r])), [reviews]);
  const streaming = turn?.status === "streaming";

  useEffect(() => () => controller.current?.abort(), []);

  async function ask(question: string) {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    setTurn({ question, parts: [], status: "streaming" });
    setWaking(false);
    // An idle model host can take a while to start; say so instead of spinning silently.
    const wakingTimer = setTimeout(() => setWaking(true), WAKING_AFTER_MS);
    const update = (fn: (t: Turn) => Turn) => setTurn((t) => (t ? fn(t) : t));
    try {
      const res = await fetch(`/api/shops/${shopId}/ask`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Couldn't get an answer.");
      }
      for await (const chunk of readNdjson(res.body, (v) => ChatChunkSchema.parse(v))) {
        clearTimeout(wakingTimer);
        setWaking(false);
        if (chunk.type === "text") {
          update((t) => {
            const last = t.parts.at(-1);
            const parts: Part[] =
              last?.kind === "text"
                ? [...t.parts.slice(0, -1), { kind: "text", text: last.text + chunk.text }]
                : [...t.parts, { kind: "text", text: chunk.text }];
            return { ...t, parts };
          });
        } else if (chunk.type === "citation") {
          update((t) => ({ ...t, parts: [...t.parts, { kind: "cite", reviewId: chunk.reviewId }] }));
        } else if (chunk.type === "done") {
          update((t) => ({ ...t, status: "done" }));
        } else {
          update((t) => ({ ...t, status: "error", error: chunk.message }));
        }
      }
      // A stream that closes without "done" or "error" was cut off; never leave the turn spinning.
      update((t) => (t.status === "streaming" ? { ...t, status: "error", error: "The answer was interrupted. Please try again." } : t));
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      update((t) => ({ ...t, status: "error", error: (err as Error).message }));
    } finally {
      clearTimeout(wakingTimer);
      setWaking(false);
    }
  }

  // Number each cited review in order of first appearance.
  const citeNumbers = new Map<string, number>();
  turn?.parts.forEach((p) => {
    if (p.kind === "cite" && !citeNumbers.has(p.reviewId)) citeNumbers.set(p.reviewId, citeNumbers.size + 1);
  });
  const cited = [...citeNumbers.keys()].map((id) => reviewById.get(id)).filter((r): r is Review => Boolean(r));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || streaming) return;
    setInput("");
    void ask(q);
  };

  const showSource = (id: string) => {
    const el = document.getElementById(`source-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.parentElement?.focus();
  };

  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested questions">
          {suggestions.map((s) => (
            <button key={s} type="button" disabled={streaming} onClick={() => void ask(s)} className="border border-line bg-panel px-3 py-1 text-left text-sm hover:border-accent disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>

        <div className="mt-4 min-h-40 border border-line bg-panel p-4">
          {!turn ? (
            <p className="label">Answers appear here, with links to the reviews they come from</p>
          ) : (
            <div>
              <p className="m-0 mb-3 inline-block border border-line bg-panel-2 px-2.5 py-1 text-sm">{turn.question}</p>
              <div aria-live="polite" className="font-serif text-base leading-relaxed">
                {turn.parts.map((p, i) =>
                  p.kind === "text" ? (
                    <span key={i}>{p.text}</span>
                  ) : (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Source ${citeNumbers.get(p.reviewId)}`}
                      onClick={() => showSource(p.reviewId)}
                      className="mx-0.5 border border-accent px-1 font-mono text-[11px] text-accent hover:bg-accent hover:text-bg"
                    >
                      {citeNumbers.get(p.reviewId)}
                    </button>
                  ),
                )}
                {streaming && <span aria-hidden className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-ink align-[-2px]" />}
              </div>
              {waking && <p className="mt-2 text-sm text-muted">Waking the model (the first answer can take up to 30 s)…</p>}
              {turn.status === "error" && (
                <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 border border-neg/60 p-3 text-sm">
                  <span>{turn.error ?? "Couldn't get an answer."}</span>
                  <button type="button" onClick={() => void ask(turn.question)} className="border border-neg px-2 py-0.5 text-neg hover:bg-neg hover:text-bg">
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={submit} className="mt-3 flex gap-2">
          <input
            aria-label="Ask a question about these reviews"
            placeholder="Ask anything about these reviews…"
            maxLength={500}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-w-0 flex-1 border border-line bg-panel-2 px-3 py-2 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button type="submit" disabled={!input.trim() || streaming} className="border border-accent bg-accent px-4 text-sm font-semibold text-bg disabled:opacity-40">
            Ask
          </button>
        </form>
      </div>

      <section aria-label="Sources">
        <p className="label mb-1">Sources</p>
        {cited.length === 0 ? (
          <p className="text-sm text-muted">Cited reviews will show here.</p>
        ) : (
          cited.map((r) => (
            <div key={r.id} tabIndex={-1} className="outline-none focus:bg-accent/10">
              <p className="m-0 mt-2 font-mono text-xs text-accent">[{citeNumbers.get(r.id)}]</p>
              <ReviewCard review={r} aspectNames={aspectNames} id={`source-${r.id}`} />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
