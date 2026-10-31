import type { Review, ReviewPage, ReviewQuery, ReviewSort } from "../schemas";

const byDate = (a: Review, b: Review) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
// Reviews without stars sort as 3★ so they sit in the middle.
const stars = (r: Review) => r.stars ?? 3;

const COMPARE: Record<ReviewSort, (a: Review, b: Review) => number> = {
  newest: (a, b) => byDate(b, a),
  oldest: byDate,
  lowest: (a, b) => stars(a) - stars(b) || byDate(b, a),
  highest: (a, b) => stars(b) - stars(a) || byDate(b, a),
};

/** Filter, sort and page reviews. The cursor is simply the offset of the next page. */
export function queryReviews(reviews: Review[], q: ReviewQuery): ReviewPage {
  const search = q.search?.toLowerCase();
  const matching = reviews
    .filter(
      (r) =>
        (!q.sentiment || r.sentiment === q.sentiment) &&
        (q.stars === undefined || r.stars === q.stars) &&
        (!q.aspectId || r.aspectMentions.some((m) => m.aspectId === q.aspectId)) &&
        (!search || r.text.toLowerCase().includes(search)),
    )
    .sort(COMPARE[q.sort]);
  const offset = q.cursor ? Number(q.cursor) : 0;
  const next = offset + q.limit;
  return {
    items: matching.slice(offset, next),
    nextCursor: next < matching.length ? String(next) : null,
    total: matching.length,
  };
}
