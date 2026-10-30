import type { ComplaintItem } from "@/lib/data/derive";
import { fmtPct } from "@/lib/format";

export function TopComplaints({ items }: { items: ComplaintItem[] }) {
  if (items.length === 0) return <p className="text-sm text-muted">No clear complaints in this range.</p>;
  return (
    <ol className="m-0 list-none p-0">
      {items.map((item) => (
        <li key={item.aspectId} className="border-t border-line py-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate font-medium" title={item.name}>{item.name}</span>
            <span className="shrink-0 font-mono text-xs text-neg">{fmtPct(item.negPct)} negative</span>
          </div>
          {item.quote && <q className="mt-1 block font-serif text-sm text-muted">{item.quote}</q>}
        </li>
      ))}
    </ol>
  );
}
