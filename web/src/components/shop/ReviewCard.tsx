import type { Review } from "@/lib/data/schemas";
import { fmtDate } from "@/lib/format";
import { HighlightedText } from "./HighlightedText";

const PILL = {
  positive: "border-pos/60 text-pos",
  negative: "border-neg/60 text-neg",
  neutral: "border-accent/60 text-accent",
} as const;

function Stars({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted">No rating</span>;
  return (
    <span aria-label={`${value} out of 5 stars`} className="font-mono text-accent">
      {"★".repeat(value)}
      <span className="opacity-25">{"★".repeat(5 - value)}</span>
    </span>
  );
}

type Props = { review: Review; aspectNames: Record<string, string>; id?: string };

export function ReviewCard({ review, aspectNames, id }: Props) {
  return (
    <article id={id} className="grid scroll-mt-24 gap-1 border-t border-line py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <Stars value={review.stars} />
        <span className="font-mono text-muted">{fmtDate(review.date)}</span>
        <span className={`ml-auto border px-1.5 font-mono ${PILL[review.sentiment]}`}>{review.sentiment}</span>
      </div>
      <p className="m-0 font-serif text-[15px] leading-relaxed">
        <HighlightedText text={review.text} mentions={review.aspectMentions} aspectNames={aspectNames} />
      </p>
      {review.helpful ? <p className="m-0 text-xs text-muted">{review.helpful} found this helpful</p> : null}
    </article>
  );
}
