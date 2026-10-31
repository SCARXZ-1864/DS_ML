import type { Aspect, Review, Topic } from "../schemas";
import { ASPECT_KEYWORDS } from "./keywords";

/** Mock topics: one per mentioned aspect. Part 2 replaces this with BERTopic clusters. */
export function deriveTopics(aspects: Aspect[], reviews: Review[]): Topic[] {
  return aspects
    .filter((a) => a.mentions > 0)
    .map((a) => {
      const keywords = ASPECT_KEYWORDS[a.id] ?? [a.name.toLowerCase()];
      const polar = a.posPct + a.negPct;
      return {
        id: `t-${a.id}`,
        label: `${a.name}: ${keywords.slice(0, 2).join(", ")}`,
        keywords,
        size: a.mentions,
        negShare: polar === 0 ? 0 : Math.round((a.negPct / polar) * 100) / 100,
        monthly: a.monthly,
        representativeReviewIds: reviews
          .filter((r) => r.aspectMentions.some((m) => m.aspectId === a.id))
          .slice(0, 3)
          .map((r) => r.id),
      };
    })
    .sort((x, y) => y.size - x.size);
}
