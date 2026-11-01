import { describe, expect, it } from "vitest";
import { ReviewQuerySchema, type Review } from "../schemas";
import { queryReviews } from "./query";

const r = (id: string, date: string | null, stars: number | null, sentiment: Review["sentiment"], text: string, aspectId = "a"): Review => ({
  id, date, stars, text, sentiment, confidence: 0.9, aspectMentions: [{ aspectId, start: 0, end: 1, sentiment }],
});
const reviews = [
  r("1", "2026-01-05", 5, "positive", "Lovely food"),
  r("2", "2026-03-10", 1, "negative", "Cold FOOD and slow", "b"),
  r("3", "2026-02-01", 3, "neutral", "Okay"),
  r("4", "2026-04-20", 2, "negative", "Rude staff", "b"),
];
const q = (input: Record<string, unknown> = {}) => ReviewQuerySchema.parse(input);

describe("queryReviews", () => {
  it("sorts newest first by default and reports the total", () => {
    const page = queryReviews(reviews, q());
    expect(page.items.map((x) => x.id)).toEqual(["4", "2", "3", "1"]);
    expect(page.total).toBe(4);
    expect(page.nextCursor).toBeNull();
  });

  it("puts reviews without a date last, whichever way dates are sorted", () => {
    const withUndated = [...reviews, r("5", null, 4, "positive", "No date here")];
    expect(queryReviews(withUndated, q()).items.map((x) => x.id)).toEqual(["4", "2", "3", "1", "5"]);
    expect(queryReviews(withUndated, q({ sort: "oldest" })).items.map((x) => x.id)).toEqual(["1", "3", "2", "4", "5"]);
  });

  it("filters by sentiment, stars and aspect", () => {
    expect(queryReviews(reviews, q({ sentiment: "negative" })).items.map((x) => x.id)).toEqual(["4", "2"]);
    expect(queryReviews(reviews, q({ stars: 3 })).items.map((x) => x.id)).toEqual(["3"]);
    expect(queryReviews(reviews, q({ aspectId: "b" })).total).toBe(2);
  });

  it("searches text case-insensitively", () => {
    expect(queryReviews(reviews, q({ search: "food" })).items.map((x) => x.id)).toEqual(["2", "1"]);
  });

  it("sorts by lowest and highest stars", () => {
    expect(queryReviews(reviews, q({ sort: "lowest" })).items[0].id).toBe("2");
    expect(queryReviews(reviews, q({ sort: "highest" })).items[0].id).toBe("1");
  });

  it("paginates with a cursor", () => {
    const first = queryReviews(reviews, q({ limit: 3 }));
    expect(first.items).toHaveLength(3);
    expect(first.nextCursor).toBe("3");
    const second = queryReviews(reviews, q({ limit: 3, cursor: first.nextCursor! }));
    expect(second.items.map((x) => x.id)).toEqual(["1"]);
    expect(second.nextCursor).toBeNull();
  });

  it("returns an empty page when nothing matches", () => {
    expect(queryReviews(reviews, q({ search: "zebra" }))).toEqual({ items: [], nextCursor: null, total: 0 });
  });
});
