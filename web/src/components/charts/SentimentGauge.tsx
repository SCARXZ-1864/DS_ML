import type { Tone } from "@/lib/data/schemas";

const VERDICT: Record<Tone, string> = { positive: "positive", negative: "negative", neutral: "mixed or neutral" };

/** A −1…+1 scale with a needle. Exposed to screen readers as a meter. */
export function SentimentGauge({ score, sentiment }: { score: number; sentiment: Tone }) {
  return (
    <div>
      <div className="label flex justify-between" aria-hidden>
        <span>Negative</span>
        <span>Neutral</span>
        <span>Positive</span>
      </div>
      <div
        role="meter"
        aria-label="Sentiment score"
        aria-valuemin={-1}
        aria-valuemax={1}
        aria-valuenow={score}
        aria-valuetext={VERDICT[sentiment]}
        className="relative my-1.5 h-2.5"
        style={{ background: "linear-gradient(90deg, var(--color-neg), var(--color-accent) 50%, var(--color-pos))" }}
      >
        <span
          aria-hidden
          className="absolute -top-1.5 h-5.5 w-[3px] bg-ink transition-[left] duration-500 ease-out"
          style={{ left: `calc(${50 + score * 48}% - 1.5px)` }}
        />
      </div>
    </div>
  );
}
