import type { AlertEvent } from "@/lib/data/schemas";
import { fmtDate } from "@/lib/format";

const TONE: Record<AlertEvent["tone"], string> = { negative: "text-neg", positive: "text-pos", neutral: "text-muted" };

/** Past alerts, newest first. Unread ones carry an accent bar and the word "New". */
export function AlertFeed({ events }: { events: AlertEvent[] }) {
  if (events.length === 0) return <p className="text-muted">No alerts yet. They appear here when a rule is triggered.</p>;
  return (
    <ol className="m-0 grid list-none gap-2 p-0">
      {events.map((e) => (
        <li key={e.id} className={`border-l-2 bg-panel px-4 py-3 ${e.read ? "border-line" : "border-accent"}`}>
          <p className="flex flex-wrap items-baseline gap-x-3 text-sm">
            <span className="font-mono text-muted">{fmtDate(e.createdAt.slice(0, 10))}</span>
            {!e.read && <span className="label text-accent">New</span>}
          </p>
          <p className={`mt-1 ${TONE[e.tone]}`}>{e.title}</p>
          {e.detail && <p className="mt-0.5 text-sm text-muted">{e.detail}</p>}
        </li>
      ))}
    </ol>
  );
}
