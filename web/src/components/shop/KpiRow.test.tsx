// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { RangeSummary } from "@/lib/data/derive";
import { KpiRow } from "./KpiRow";

const summary: RangeSummary = { reviews: 1234, positivePct: 60, negativePct: 25, neutralPct: 15, starMix: [1, 1, 1, 1, 1], avgStars: 4.1 };

describe("KpiRow", () => {
  it("shows the four headline numbers", () => {
    render(<KpiRow summary={summary} />);
    expect(screen.getByText("1,234")).toBeTruthy();
    expect(screen.getByText("60.0%")).toBeTruthy();
    expect(screen.getByText("25.0%")).toBeTruthy();
    expect(screen.getByText("4.10")).toBeTruthy();
  });

  it("shows a dash, not NaN, when there are no star ratings", () => {
    render(<KpiRow summary={{ ...summary, starMix: null, avgStars: null }} />);
    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.queryByText(/NaN/)).toBeNull();
  });

  it("colours changes by whether they are good or bad", () => {
    const baseline: RangeSummary = { ...summary, positivePct: 59.7, negativePct: 20, avgStars: 4.1 };
    render(<KpiRow summary={summary} baseline={baseline} />);
    expect(screen.getByText("▲ 0.3 pts vs all time").className).toContain("text-pos");
    expect(screen.getByText("▲ 5.0 pts vs all time").className).toContain("text-neg");
  });
});
