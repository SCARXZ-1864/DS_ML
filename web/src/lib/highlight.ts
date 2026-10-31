import type { Review, Tone } from "@/lib/data/schemas";

export type Segment = { text: string; mention?: { aspectId: string; sentiment: Tone } };

/** Splits review text into plain and highlighted pieces. Joining the pieces always gives back the text. */
export function segmentText(text: string, mentions: Review["aspectMentions"]): Segment[] {
  const spans = mentions
    .filter((m) => m.start >= 0 && m.start < m.end && m.end <= text.length)
    .sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let pos = 0;
  for (const m of spans) {
    if (m.start < pos) continue; // overlaps the previous mention: keep the first one
    if (m.start > pos) out.push({ text: text.slice(pos, m.start) });
    out.push({ text: text.slice(m.start, m.end), mention: { aspectId: m.aspectId, sentiment: m.sentiment } });
    pos = m.end;
  }
  if (pos < text.length || out.length === 0) out.push({ text: text.slice(pos) });
  return out;
}
