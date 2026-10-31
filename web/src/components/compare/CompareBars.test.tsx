// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Comparison, Shop } from "@/lib/data/schemas";
import { CompareBars } from "./CompareBars";

const shop = (id: string, name: string): Shop => ({
  id, name, type: "restaurant", isDemo: true, reviewCount: 1, dateRange: { from: "2026-01", to: "2026-10" }, unreadAlerts: 0,
});

const comparison = (net: (number | null)[]): Comparison => ({
  shops: [shop("a", "Alpha"), shop("b", "Beta")],
  rows: [{ group: "service", name: "Wait time", net }],
});

describe("CompareBars", () => {
  it("flags a gap of 15 points or more", () => {
    render(<CompareBars comparison={comparison([40, 10])} />);
    expect(screen.getByText("Gap: 30 pts")).toBeTruthy();
    expect(screen.getByText("+40")).toBeTruthy();
    expect(screen.getByText("+10")).toBeTruthy();
  });

  it("doesn't flag a small gap", () => {
    render(<CompareBars comparison={comparison([20, 10])} />);
    expect(screen.queryByText(/Gap:/)).toBeNull();
  });

  it("says when a shop doesn't mention the aspect", () => {
    render(<CompareBars comparison={comparison([25, null])} />);
    expect(screen.getByText("Not mentioned")).toBeTruthy();
  });

  it("labels each bar with its shop", () => {
    render(<CompareBars comparison={comparison([-12, 30])} />);
    expect(screen.getAllByText("Alpha").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Beta").length).toBeGreaterThan(0);
    expect(screen.getByText("−12")).toBeTruthy();
  });
});
