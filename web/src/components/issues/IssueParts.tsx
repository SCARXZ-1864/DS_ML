import { HighlightedText } from "@/components/shop/HighlightedText";
import type { Issue } from "@/lib/data/issues";
import type { Review } from "@/lib/data/schemas";
import { fmtDate } from "@/lib/format";

const STEADY_PTS = 5; // smaller moves than this are within normal month-to-month noise

/** "Getting worse", "Improving", "Steady", or a note when there's too little data to tell. */
export function TrendBadge({ change }: { change: number | null }) {
  if (change === null) return <span className="font-mono text-xs text-muted">trend: too little recent data</span>;
  if (change >= STEADY_PTS)
    return <span className="font-mono text-xs text-neg">▲ getting worse · +{Math.round(change)} pts in 3 months</span>;
  if (change <= -STEADY_PTS)
    return <span className="font-mono text-xs text-pos">▼ improving · {Math.round(change)} pts in 3 months</span>;
  return <span className="font-mono text-xs text-muted">● steady</span>;
}

/** Up to `n` reviews that complain about the issue: negative overall first, then in the issue's order. */
export function evidenceFor(issue: Issue, reviews: Review[], n = 2): Review[] {
  const byId = new Map(reviews.map((r) => [r.id, r]));
  const complaining = issue.reviewIds
    .map((id) => byId.get(id))
    .filter((r): r is Review => !!r && r.aspectMentions.some((m) => m.aspectId === issue.aspectId && m.sentiment === "negative"));
  return [...complaining.filter((r) => r.sentiment === "negative"), ...complaining.filter((r) => r.sentiment !== "negative")].slice(0, n);
}

/** Complaint quotes with only this issue's negative mentions underlined. */
export function Evidence({ issue, reviews }: { issue: Issue; reviews: Review[] }) {
  const quotes = evidenceFor(issue, reviews);
  if (quotes.length === 0) return null;
  return (
    <ul className="mt-3 grid list-none gap-2 p-0">
      {quotes.map((r) => (
        <li key={r.id} className="border-l-2 border-line pl-3 text-sm">
          <q className="font-serif text-muted">
            <HighlightedText
              text={r.text}
              mentions={r.aspectMentions.filter((m) => m.aspectId === issue.aspectId && m.sentiment === "negative")}
            />
          </q>
          <span className="ml-2 font-mono text-xs text-muted">
            {r.stars ? `${r.stars}★ · ` : ""}
            {r.date ? fmtDate(r.date) : "No date"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Words({ words }: { words: string[] }) {
  if (words.length === 0) return null;
  return (
    <p className="mt-2 flex flex-wrap gap-1.5 text-xs">
      <span className="text-muted">Customers say:</span>
      {words.map((w) => (
        <span key={w} className="border border-neg/40 px-1.5 text-neg">
          {w}
        </span>
      ))}
    </p>
  );
}
