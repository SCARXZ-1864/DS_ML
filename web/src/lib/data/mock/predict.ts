import type { Aspect, Prediction, Tone } from "../schemas";
import { ASPECT_KEYWORDS } from "./keywords";

// A word-list stand-in for the DistilBERT + ABSA models (Parts 2 and 4).

const POSITIVE = new Set([
  "great", "good", "excellent", "love", "loved", "lovely", "amazing", "perfect", "fresh", "friendly", "fast", "quick",
  "clean", "tasty", "delicious", "happy", "best", "solid", "worth", "recommend", "nice", "fantastic", "helpful",
  "smooth", "quiet", "efficient", "fair", "value",
]);
const NEGATIVE = new Set([
  "bad", "terrible", "awful", "worst", "slow", "late", "rude", "dirty", "cold", "stale", "wilted", "broken", "broke",
  "dead", "loud", "expensive", "overpriced", "disappointed", "disappointing", "never", "poor", "crushed", "leaked",
  "postponed", "missing", "sticky", "mushy", "noisy", "waited", "letdown", "ruined", "horrible",
]);

// Words, runs of whitespace, and punctuation, so joining the tokens rebuilds the exact text.
const TOKEN = /[\p{L}\p{N}']+|\s+|[^\p{L}\p{N}'\s]+/gu;

type Token = Prediction["tokens"][number];

export function predictText(text: string, aspects: Aspect[]): Prediction {
  const vocab = new Map<string, string>();
  for (const a of aspects) {
    for (const w of [...a.name.toLowerCase().split(/\s+/), ...(ASPECT_KEYWORDS[a.id] ?? [])]) {
      if (w.length > 2 && !vocab.has(w)) vocab.set(w, a.id);
    }
  }

  const tokens: Token[] = (text.match(TOKEN) ?? []).map((t) => ({ text: t }));
  const aspectScore = new Map<string, number>();
  let pos = 0;
  let neg = 0;
  let sentence = { aspects: new Set<string>(), score: 0 };
  const flush = () => {
    for (const id of sentence.aspects) aspectScore.set(id, (aspectScore.get(id) ?? 0) + sentence.score);
    sentence = { aspects: new Set<string>(), score: 0 };
  };

  for (const token of tokens) {
    const w = token.text.toLowerCase();
    if (POSITIVE.has(w)) {
      token.tone = "positive";
      pos++;
      sentence.score++;
    } else if (NEGATIVE.has(w)) {
      token.tone = "negative";
      neg++;
      sentence.score--;
    }
    const aspectId = vocab.get(w);
    if (aspectId) {
      token.aspectId = aspectId;
      sentence.aspects.add(aspectId);
    }
    // A sentence ends at . ! ? and "but" starts a new clause with its own sentiment.
    if (/[.!?]/.test(token.text) || w === "but") flush();
  }
  flush();

  const hits = pos + neg;
  const score = hits === 0 ? 0 : (pos - neg) / hits;
  const toneOf = (s: number): Tone => (s > 0 ? "positive" : s < 0 ? "negative" : "neutral");
  const names = new Map(aspects.map((a) => [a.id, a.name]));
  return {
    sentiment: hits === 0 || Math.abs(score) < 0.2 ? "neutral" : toneOf(score),
    score: Math.round(score * 100) / 100,
    confidence: hits === 0 ? 0.3 : Math.round(Math.min(0.95, 0.5 + 0.1 * hits) * 100) / 100,
    tokens,
    aspects: [...aspectScore].map(([id, s]) => ({ id, name: names.get(id) ?? id, sentiment: toneOf(s) })),
  };
}
