import type { AspectRow } from "@/lib/data/derive";
import { fmtSigned } from "@/lib/format";

/** Diverging bars: negative grows left from the centre line, positive grows right. */
export function AspectBars({ rows }: { rows: AspectRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted">No aspects mentioned in this range.</p>;
  return (
    <div>
      <ul className="m-0 grid list-none gap-2 p-0">
        {rows.map((r, i) => {
          const net = Math.round(r.posPct - r.negPct);
          const delay = { animationDelay: `${i * 50}ms` };
          return (
            <li key={r.id} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3 text-sm">
              <span className="sr-only">
                {`${r.name}: ${Math.round(r.posPct)}% positive, ${Math.round(r.negPct)}% negative, net ${fmtSigned(net)}`}
              </span>
              <span aria-hidden className="truncate" title={r.name}>{r.name}</span>
              <span aria-hidden className="grid h-3.5 grid-cols-2">
                <span className="animate-grow h-full origin-right justify-self-end bg-neg" style={{ width: `${r.negPct}%`, ...delay }} />
                <span className="animate-grow h-full origin-left bg-pos" style={{ width: `${r.posPct}%`, ...delay }} />
              </span>
              <span aria-hidden className={`text-right font-mono text-xs ${net < 0 ? "text-neg" : "text-pos"}`}>
                {fmtSigned(net)}
              </span>
            </li>
          );
        })}
      </ul>
      <p aria-hidden className="mt-2 ml-[8.25rem] mr-[3.75rem] flex justify-between border-t border-line pt-1 font-mono text-[10.5px] text-muted">
        <span>← negative</span>
        <span>positive →</span>
      </p>
    </div>
  );
}
