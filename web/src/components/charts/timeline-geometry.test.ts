import { describe, expect, it } from "vitest";
import type { MonthPoint } from "@/lib/data/schemas";
import { indexFromX, rangeFromIndices, timelinePaths, timelineSummary } from "./timeline-geometry";

const monthly: MonthPoint[] = Array.from({ length: 36 }, (_, i) => {
  const d = new Date(Date.UTC(2023, 10 + i, 1));
  const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return { month, count: 100, pos: 70, neg: 20, neu: 10, stars: null };
});

describe("timeline geometry", () => {
  it("builds line and area paths across the full width", () => {
    const p = timelinePaths(monthly);
    expect(p.posLine.startsWith("M")).toBe(true);
    expect(p.posArea).toContain("Z");
    expect(p.xAt(0)).toBe(0);
    expect(p.xAt(35)).toBe(800);
  });

  it("leaves a gap for a month with no reviews", () => {
    const gappy = monthly.map((m, i) => (i === 10 ? { ...m, count: 0, pos: 0, neg: 0, neu: 0 } : m));
    expect(timelinePaths(gappy).posLine.match(/M/g)).toHaveLength(2);
  });

  it("maps a pixel position to the nearest month, clamped", () => {
    expect(indexFromX(100, 800, 36)).toBe(4);
    expect(indexFromX(-50, 800, 36)).toBe(0);
    expect(indexFromX(900, 800, 36)).toBe(35);
    expect(indexFromX(100, 0, 36)).toBe(0);
    expect(indexFromX(100, 800, 1)).toBe(0);
  });

  it("turns two indices into an ordered month range", () => {
    expect(rangeFromIndices(monthly, 9, 3)).toEqual({ from: monthly[3].month, to: monthly[9].month });
  });

  it("describes the trend in words", () => {
    expect(timelineSummary(monthly)).toBe(
      "Positive share went from 70% in Nov 2023 to 70% in Oct 2026; negative share went from 20% to 20%.",
    );
  });
});
