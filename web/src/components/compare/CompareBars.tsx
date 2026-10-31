import type { Comparison } from "@/lib/data/schemas";
import { fmtSigned } from "@/lib/format";

const GAP_PTS = 15;

/** A bar from the centre: right and green for a positive net score, left and red for negative. */
function NetBar({ value }: { value: number }) {
  const width = `${Math.min(100, Math.abs(value)) / 2}%`;
  return (
    <div className="relative h-2.5 bg-panel-2" aria-hidden>
      <span className="absolute inset-y-0 left-1/2 w-px bg-line" />
      <span className={`absolute inset-y-0 ${value >= 0 ? "left-1/2 bg-pos" : "right-1/2 bg-neg"}`} style={{ width }} />
    </div>
  );
}

/** Each aspect's net score for both shops, with big differences called out. */
export function CompareBars({ comparison }: { comparison: Comparison }) {
  const [a, b] = comparison.shops;
  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {comparison.rows.map((row) => {
        const [x, y] = row.net;
        const gap = x !== null && y !== null ? Math.abs(x - y) : null;
        const flagged = gap !== null && gap >= GAP_PTS;
        return (
          <li key={row.name} className={`grid gap-2 border bg-panel px-4 py-3 ${flagged ? "border-accent" : "border-line"}`}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">{row.name}</span>
              {flagged && <span className="label text-accent">Gap: {gap} pts</span>}
            </div>
            {[a, b].map((shop, i) => {
              const value = row.net[i];
              return (
                <div key={shop.id} className="grid grid-cols-[minmax(6rem,12rem)_1fr_3rem] items-center gap-3 text-sm">
                  <span className="truncate text-muted" title={shop.name}>{shop.name}</span>
                  {value === null ? <span className="text-muted">Not mentioned</span> : <NetBar value={value} />}
                  <span className={`text-right font-mono ${value === null ? "text-muted" : value >= 0 ? "text-pos" : "text-neg"}`}>
                    {value === null ? "—" : fmtSigned(value)}
                  </span>
                </div>
              );
            })}
          </li>
        );
      })}
    </ul>
  );
}
