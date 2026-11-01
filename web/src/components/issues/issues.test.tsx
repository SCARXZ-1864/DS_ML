// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Issue, RankedIssue } from "@/lib/data/issues";
import type { Review, Shop } from "@/lib/data/schemas";
import { FixFirstView, whyRanked } from "./FixFirstView";
import { evidenceFor, TrendBadge } from "./IssueParts";
import { IssuesView } from "./IssuesView";

const shop: Shop = {
  id: "cafe", name: "Cafe", type: "restaurant", isDemo: true, reviewCount: 100,
  dateRange: { from: "2026-01", to: "2026-06" }, unreadAlerts: 0,
};
const issue: Issue = {
  aspectId: "wait-time", name: "Wait time", complaints: 24, reachPct: 8, negPct: 40, change: 40,
  words: ["forty minutes"], reviewIds: ["happy", "cross", "other"],
};
const review = (id: string, sentiment: Review["sentiment"], aspectId = "wait-time", tone: Review["sentiment"] = "negative"): Review => ({
  id, date: "2026-05-02", stars: 2, text: `We waited forever (${id}).`, sentiment, confidence: 0.9,
  aspectMentions: [{ aspectId, start: 3, end: 9, sentiment: tone }],
});
const reviews = [review("happy", "positive"), review("cross", "negative"), review("other", "negative", "food")];

describe("evidenceFor", () => {
  it("quotes reviews that complain about the issue, negative ones first", () => {
    expect(evidenceFor(issue, reviews).map((r) => r.id)).toEqual(["cross", "happy"]);
  });

  it("skips reviews that only praise the aspect", () => {
    const praise = review("praise", "positive", "wait-time", "positive");
    expect(evidenceFor({ ...issue, reviewIds: ["praise"] }, [praise])).toEqual([]);
  });
});

describe("TrendBadge", () => {
  it("says whether the problem is getting worse, improving or steady", () => {
    const { rerender } = render(<TrendBadge change={12} />);
    expect(screen.getByText(/getting worse · \+12 pts/)).toBeTruthy();
    rerender(<TrendBadge change={-8} />);
    expect(screen.getByText(/improving · -8 pts/)).toBeTruthy();
    rerender(<TrendBadge change={2} />);
    expect(screen.getByText(/steady/)).toBeTruthy();
    rerender(<TrendBadge change={null} />);
    expect(screen.getByText(/too little recent data/)).toBeTruthy();
  });
});

describe("IssuesView", () => {
  it("shows each issue with its numbers, words and quotes", () => {
    render(<IssuesView shop={shop} issues={[issue]} reviews={reviews} />);
    expect(screen.getByRole("heading", { name: "Wait time" })).toBeTruthy();
    expect(screen.getByText("24 complaints")).toBeTruthy();
    expect(screen.getByText("forty minutes")).toBeTruthy();
    expect(screen.getByText(/\(cross\)/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /what to fix first/i }).getAttribute("href")).toBe("/shops/cafe/fix-first");
  });

  it("writes one complaint in the singular", () => {
    render(<IssuesView shop={shop} issues={[{ ...issue, complaints: 1 }]} reviews={[]} />);
    expect(screen.getByText("1 complaint")).toBeTruthy();
  });

  it("says so when there are no complaints", () => {
    render(<IssuesView shop={shop} issues={[]} reviews={[]} />);
    expect(screen.getByText("No complaints found in these reviews.")).toBeTruthy();
  });
});

describe("FixFirstView", () => {
  const ranked: RankedIssue[] = [
    { ...issue, impact: 100 },
    { ...issue, aspectId: "food", name: "Food", change: null, words: [], impact: 30 },
  ];

  it("numbers the issues in order with their impact and a first step", () => {
    render(<FixFirstView shop={shop} ranked={ranked} reviews={reviews} />);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["Number 1: Wait time", "Number 2: Food"]);
    expect(screen.getByRole("img", { name: "Impact 100 out of 100" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Impact 30 out of 100" })).toBeTruthy();
    expect(screen.getAllByText("Try first")).toHaveLength(2);
  });

  it("explains the ranking in a sentence, mentioning a rise only when there is one", () => {
    expect(whyRanked(ranked[0])).toBe("8.0% of reviews complain about it; 40.0% of its mentions are negative, and complaints rose 40 points in 3 months.");
    expect(whyRanked(ranked[1])).toBe("8.0% of reviews complain about it; 40.0% of its mentions are negative.");
  });
});
