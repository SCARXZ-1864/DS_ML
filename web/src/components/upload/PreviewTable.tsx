import type { UploadRow } from "@/lib/data/schemas";
import { fmtDate, fmtInt } from "@/lib/format";
import type { Skipped } from "@/lib/upload/rows";

/** The first rows exactly as they will be imported, and what will be skipped. */
export function PreviewTable({ rows, total, skipped }: { rows: UploadRow[]; total: number; skipped: Skipped }) {
  const skippedTotal = skipped.empty + skipped.duplicate + skipped.invalid;
  return (
    <div className="grid gap-3">
      <p className="text-sm">
        <span className="font-mono">{fmtInt(total)}</span> reviews will be imported
        {skippedTotal > 0 && (
          <span className="text-muted">
            {" "}· <span className="font-mono">{fmtInt(skippedTotal)}</span> skipped ({skipped.empty} empty, {skipped.duplicate} duplicate,{" "}
            {skipped.invalid} with a bad rating, date or length)
          </span>
        )}
      </p>
      <div className="overflow-x-auto border border-line">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">First rows to import</caption>
          <thead className="bg-panel-2 text-muted">
            <tr>
              <th scope="col" className="px-3 py-2 font-normal">Review</th>
              <th scope="col" className="px-3 py-2 font-normal">Stars</th>
              <th scope="col" className="px-3 py-2 font-normal">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-line align-top">
                <td className="max-w-xl px-3 py-2">{r.text}</td>
                <td className="px-3 py-2 font-mono">{r.stars ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono">{r.date ? fmtDate(r.date) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
