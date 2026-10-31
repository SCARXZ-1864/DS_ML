import type { ColumnRole, UploadRow } from "@/lib/data/schemas";
import { fmtInt } from "@/lib/format";

export const MAX_ROWS = 5000;
export const MAX_BYTES = 10 * 1024 * 1024;
export const MAX_TEXT = 5000;

export type Skipped = { empty: number; duplicate: number; invalid: number };

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-10-03", "03/10/2026" (day first) or an ISO timestamp → "2026-10-03"; null if it isn't a real date. */
export function parseDate(value: string): string | null {
  const v = value.trim();
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  let [y, mo, d] = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
  if (!m) {
    m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  }
  const date = new Date(Date.UTC(y, mo - 1, d));
  // Date.UTC rolls 31 Feb over into March, so a round trip catches impossible dates.
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

const parseStars = (value: string): number | null => (/^[1-5]$/.test(value.trim()) ? Number(value.trim()) : null);

/** Applies the column mapping: cleans each row, and counts the rows it had to skip and why. */
export function prepareRows(rows: string[][], mapping: Partial<Record<number, ColumnRole>>): { accepted: UploadRow[]; skipped: Skipped } {
  const col = (role: ColumnRole) => {
    const entry = Object.entries(mapping).find(([, r]) => r === role);
    return entry ? Number(entry[0]) : -1;
  };
  const [textCol, starsCol, dateCol] = [col("text"), col("stars"), col("date")];
  const accepted: UploadRow[] = [];
  const skipped: Skipped = { empty: 0, duplicate: 0, invalid: 0 };
  const seen = new Set<string>();

  for (const r of rows) {
    const text = (r[textCol] ?? "").trim();
    if (!text) {
      skipped.empty++;
      continue;
    }
    const rawStars = starsCol >= 0 ? (r[starsCol] ?? "").trim() : "";
    const rawDate = dateCol >= 0 ? (r[dateCol] ?? "").trim() : "";
    const stars = rawStars ? parseStars(rawStars) : null;
    const date = rawDate ? parseDate(rawDate) : null;
    if (text.length > MAX_TEXT || (rawStars && stars === null) || (rawDate && date === null)) {
      skipped.invalid++;
      continue;
    }
    const key = text.toLowerCase();
    if (seen.has(key)) {
      skipped.duplicate++;
      continue;
    }
    seen.add(key);
    accepted.push({ text, ...(stars !== null ? { stars } : {}), ...(date !== null ? { date } : {}) });
  }
  return { accepted, skipped };
}

/** The first problem with a chosen file, as a message for the user, or null when it's fine. */
export function checkFile(file: { name: string; size: number }, dataRows?: number): string | null {
  if (!/\.csv$/i.test(file.name)) return "Upload a .csv file. Excel files can be saved as CSV from File → Save As.";
  if (file.size > MAX_BYTES) return "This file is larger than 10 MB.";
  if (dataRows === 0) return "This file has a header row but no reviews.";
  if (dataRows !== undefined && dataRows > MAX_ROWS) {
    return `This file has ${fmtInt(dataRows)} rows; the limit is 5,000. Split it and upload it in parts.`;
  }
  return null;
}
