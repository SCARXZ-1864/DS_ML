import type { Aspect, ChatChunk, Review } from "../schemas";
import { ASPECT_KEYWORDS } from "./keywords";

// A rule-based stand-in for the RAG chat (Part 6). It follows the same contract:
// answer only from the shop's reviews, cite them, and decline when they can't help.

// Whole words only: "likely" is not "like", and "still" does not contain the keyword "till".
const PRAISE = /\b(love|loved|like|best|praise|good|great|happy|enjoy)\b/;
const COMPLAINT = /\b(complain|complains|complaint|complaints|problem|problems|bad|worst|issue|issues|wrong|hate|return|returns|unhappy)\b/;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasWord = (text: string, word: string) => new RegExp(`\\b${escape(word)}\\b`).test(text);

/** Splits text into word chunks so the client can render it as it streams. */
function words(text: string): ChatChunk[] {
  return text.split(/(?<= )/).map((w) => ({ type: "text", text: w }));
}

export function composeAnswer(question: string, aspects: Aspect[], reviews: Review[]): ChatChunk[] {
  const q = question.toLowerCase();
  const named = aspects.filter(
    (a) => hasWord(q, a.name.toLowerCase()) || (ASPECT_KEYWORDS[a.id] ?? []).some((k) => hasWord(q, k)),
  );
  const wantsPraise = PRAISE.test(q);
  const wantsComplaints = COMPLAINT.test(q);

  let chosen: Aspect[];
  let tone: "positive" | "negative" | null;
  if (named.length > 0) {
    chosen = named.slice(0, 2);
    tone = wantsComplaints ? "negative" : wantsPraise ? "positive" : null;
  } else if (wantsComplaints) {
    chosen = [...aspects].sort((x, y) => y.negPct - x.negPct).slice(0, 2);
    tone = "negative";
  } else if (wantsPraise) {
    chosen = [...aspects].sort((x, y) => y.posPct - x.posPct).slice(0, 2);
    tone = "positive";
  } else {
    const suggestions = [...aspects]
      .sort((x, y) => y.mentions - x.mentions)
      .slice(0, 3)
      .map((a) => a.name.toLowerCase())
      .join(", ");
    return [...words(`I couldn't find reviews that answer that. Try asking about ${suggestions}.`), { type: "done" }];
  }

  const chunks: ChatChunk[] = [];
  chosen.forEach((a, i) => {
    chunks.push(
      ...words(`${i === 0 ? "" : " "}${a.name}: ${Math.round(a.posPct)}% of mentions are positive and ${Math.round(a.negPct)}% negative.`),
    );
    reviews
      .filter((r) => r.aspectMentions.some((m) => m.aspectId === a.id && (tone === null || m.sentiment === tone)))
      .slice(0, 2)
      .forEach((r) => chunks.push({ type: "citation", reviewId: r.id }));
  });
  chunks.push({ type: "done" });
  return chunks;
}

/** Yields chunks with a small pause between them, imitating an LLM streaming tokens. */
export async function* streamChunks(chunks: ChatChunk[], delayMs: number): AsyncIterable<ChatChunk> {
  for (const chunk of chunks) {
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    yield chunk;
  }
}
