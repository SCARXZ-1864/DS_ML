import type { Review, Tone } from "../schemas";
import { mulberry32, seedFrom } from "./rng";
import type { ShopDef } from "./shops";

// Templated reviews so every shop has enough rows to filter, sort and page through.
// "{a}" is replaced with the aspect name; it is never at the start of a sentence.
const TEMPLATES: Record<Tone, string[]> = {
  positive: [
    "Really happy with the {a} this time.",
    "The {a} was excellent, would come back for it.",
    "No complaints about the {a} at all.",
    "Loved the {a}, best in the area.",
    "The {a} has improved a lot lately.",
  ],
  negative: [
    "Disappointed with the {a} on my last visit.",
    "The {a} was a real letdown.",
    "Please fix the {a}, it keeps getting worse.",
    "Terrible {a}, not coming back.",
    "The {a} ruined an otherwise good experience.",
  ],
  neutral: ["The {a} was okay, nothing special.", "Average {a}, about what I expected."],
};

export function generateReviews(def: ShopDef, months: string[], count = 48): Review[] {
  const rnd = mulberry32(seedFrom(`${def.id}:generated`));
  const totalShare = def.aspects.reduce((s, a) => s + a.share, 0);
  const pickAspect = () => {
    let roll = rnd() * totalShare;
    for (const a of def.aspects) {
      roll -= a.share;
      if (roll <= 0) return a;
    }
    return def.aspects[def.aspects.length - 1];
  };

  return Array.from({ length: count }, (_, i) => {
    const a = pickAspect();
    const roll = rnd();
    const sentiment: Tone = roll < a.pos ? "positive" : roll < a.pos + a.neg ? "negative" : "neutral";
    const options = TEMPLATES[sentiment];
    const template = options[Math.floor(rnd() * options.length)];
    const name = a.name.toLowerCase();
    const start = template.indexOf("{a}");
    // New aspects only exist in the last quarter of the period; everything else uses the last year.
    const pool = a.isNew ? months.slice(-6) : months.slice(-12);
    const month = pool[Math.floor(rnd() * pool.length)];
    const day = String(1 + Math.floor(rnd() * 28)).padStart(2, "0");
    const stars = !def.hasStars
      ? null
      : sentiment === "positive" ? (rnd() < 0.7 ? 5 : 4) : sentiment === "negative" ? (rnd() < 0.65 ? 1 : 2) : 3;
    return {
      id: `${def.id}-g${i + 1}`,
      date: `${month}-${day}`,
      stars,
      text: template.replace("{a}", name),
      sentiment,
      confidence: Math.round((0.6 + 0.39 * rnd()) * 100) / 100,
      helpful: Math.floor(rnd() * 30),
      aspectMentions: [{ aspectId: a.id, start, end: start + name.length, sentiment }],
    };
  });
}
