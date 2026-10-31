import Link from "next/link";
import { BUTTON } from "@/components/forms/Field";
import type { Upload } from "@/lib/data/schemas";
import { fmtDate, fmtInt } from "@/lib/format";

const STATUS: Record<Upload["status"], { text: string; className: string }> = {
  processing: { text: "Processing…", className: "text-accent" },
  done: { text: "Done", className: "text-pos" },
  failed: { text: "Failed", className: "text-neg" },
};

export function UploadHistory({ shopId, uploads }: { shopId: string; uploads: Upload[] }) {
  if (uploads.length === 0) {
    return (
      <div className="border border-line bg-panel p-8">
        <p className="font-serif text-xl">No uploads yet.</p>
        <Link href={`/shops/${shopId}/uploads/new`} className={`${BUTTON} mt-4 inline-block`}>
          Upload a CSV
        </Link>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Past uploads, newest first</caption>
        <thead className="bg-panel-2 text-muted">
          <tr>
            <th scope="col" className="px-3 py-2 font-normal">File</th>
            <th scope="col" className="px-3 py-2 font-normal">Uploaded</th>
            <th scope="col" className="px-3 py-2 text-right font-normal">Imported</th>
            <th scope="col" className="px-3 py-2 text-right font-normal">Skipped</th>
            <th scope="col" className="px-3 py-2 font-normal">Status</th>
          </tr>
        </thead>
        <tbody>
          {uploads.map((u) => {
            const s = STATUS[u.status];
            const skipped = u.rowsSkipped.empty + u.rowsSkipped.duplicate + u.rowsSkipped.invalid;
            return (
              <tr key={u.id} className="border-t border-line">
                <td className="max-w-64 truncate px-3 py-2" title={u.fileName}>{u.fileName}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono">{fmtDate(u.createdAt.slice(0, 10))}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtInt(u.rowsAccepted)}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtInt(skipped)}</td>
                <td className={`px-3 py-2 ${s.className}`}>{s.text}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
