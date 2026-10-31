"use client";

import { useEffect, useState } from "react";
import { SentimentGauge } from "@/components/charts/SentimentGauge";
import { PredictionSchema, type Prediction } from "@/lib/data/schemas";

const DEBOUNCE_MS = 400;
const WAKING_AFTER_MS = 1500;
const MAX = 2000;

const TOKEN_TONE = { positive: "text-pos", negative: "text-neg", neutral: "" } as const;
const TAG = {
  positive: { sign: "+", cls: "border-pos text-pos" },
  negative: { sign: "−", cls: "border-neg text-neg" },
  neutral: { sign: "·", cls: "border-accent text-accent" },
} as const;

type Props = { shopId: string; examples: string[] };

export function LiveAnalyzer({ shopId, examples }: Props) {
  const [text, setText] = useState("");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [waking, setWaking] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Analyse after a pause in typing; a newer keystroke cancels the older request.
  useEffect(() => {
    const value = text.trim();
    if (!value) return;
    const controller = new AbortController();
    let wakingTimer: ReturnType<typeof setTimeout> | undefined;
    const debounce = setTimeout(async () => {
      setStatus("loading");
      wakingTimer = setTimeout(() => setWaking(true), WAKING_AFTER_MS);
      try {
        const res = await fetch(`/api/shops/${shopId}/predict`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: value }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setPrediction(PredictionSchema.parse(await res.json()));
        setStatus("idle");
      } catch (err) {
        if ((err as Error).name !== "AbortError") setStatus("error");
      } finally {
        clearTimeout(wakingTimer);
        setWaking(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(debounce);
      clearTimeout(wakingTimer);
      controller.abort();
    };
  }, [text, shopId, attempt]);

  const hasText = text.trim().length > 0;

  return (
    <div className="mt-5 max-w-3xl">
      {examples.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Examples">
          <span className="label">Examples</span>
          {examples.map((ex) => (
            <button key={ex} type="button" onClick={() => setText(ex)} className="border border-line bg-panel px-3 py-1 text-left text-sm hover:border-accent">
              {ex}
            </button>
          ))}
        </div>
      )}

      <textarea
        aria-label="Review text"
        placeholder="Type or paste a customer review…"
        maxLength={MAX}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mt-3 h-28 w-full resize-y border border-line bg-panel-2 p-3 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
      />
      <p className="m-0 text-right font-mono text-[11px] text-muted">{text.length.toLocaleString("en-US")} / 2,000</p>

      <div aria-live="polite" className="mt-2 min-h-32">
        {status === "loading" && <p className="m-0 text-sm text-muted">{waking ? "Waking the model (the first run can take up to 30 s)…" : "Analysing…"}</p>}
        {status === "error" && (
          <div role="alert" className="flex items-center gap-3 border border-neg/60 p-3 text-sm">
            <span>Couldn&apos;t analyse this text.</span>
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="border border-neg px-2 py-0.5 text-neg hover:bg-neg hover:text-bg">
              Retry
            </button>
          </div>
        )}
        {hasText && prediction && status !== "error" && (
          <div className="grid gap-3">
            <p className="m-0 font-serif text-lg leading-relaxed">
              {prediction.tokens.map((t, i) => (
                <span key={i} className={`${t.tone ? TOKEN_TONE[t.tone] : ""} ${t.aspectId ? "border-b-2 border-info" : ""}`}>
                  {t.text}
                </span>
              ))}
            </p>
            <SentimentGauge score={prediction.score} sentiment={prediction.sentiment} />
            <p className="m-0 font-mono text-sm">
              {prediction.sentiment} · confidence {prediction.confidence.toFixed(2)}
            </p>
            {prediction.aspects.length > 0 && (
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Aspects found">
                {prediction.aspects.map((a) => (
                  <li key={a.id} className={`animate-fade-rise border px-2 py-0.5 text-xs ${TAG[a.sentiment].cls}`}>
                    {`${TAG[a.sentiment].sign} ${a.name}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
