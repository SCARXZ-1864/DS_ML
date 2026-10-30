// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildDb } from "@/lib/data/mock/build";
import { SHOP_DEFS } from "@/lib/data/mock/shops";
import type { Overview } from "@/lib/data/schemas";
import { fmtInt } from "@/lib/format";
import { OverviewView } from "./OverviewView";

const fresh = buildDb(SHOP_DEFS).get("freshcart")!;

function renderFresh(overview: Overview = fresh.overview) {
  render(<OverviewView shop={fresh.shop} overview={overview} aspects={fresh.aspects} reviews={fresh.reviews} />);
}

describe("OverviewView", () => {
  it("shows the shop's own headline and its discovered aspects", () => {
    renderFresh();
    expect(screen.getByRole("heading", { level: 1, name: "FreshCart Grocery" })).toBeTruthy();
    expect(screen.getByText("produce freshness")).toBeTruthy();
    expect(screen.getAllByText("Freshness").length).toBeGreaterThan(0);
  });

  it("lets a long shop name wrap instead of overflowing", () => {
    render(
      <OverviewView shop={{ ...fresh.shop, name: "AVeryLongShopNameWithoutAnySpacesThatWouldOverflow" }}
        overview={fresh.overview} aspects={fresh.aspects} reviews={fresh.reviews} />,
    );
    expect(screen.getByRole("heading", { level: 1 }).className).toContain("break-words");
  });

  it("recalculates the headline and numbers for a preset range", async () => {
    renderFresh();
    fireEvent.click(screen.getByRole("button", { name: "Last 6 months" }));
    expect(screen.getByText(/^From /)).toBeTruthy();
    const last6 = fresh.overview.monthly.slice(-6).reduce((sum, p) => sum + p.count, 0);
    await waitFor(() => expect(screen.getByText(fmtInt(last6))).toBeTruthy());
    expect(screen.getByRole("button", { name: "Last 6 months" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("shows an empty state, not NaN, when the range has no reviews", () => {
    const zeroed: Overview = {
      ...fresh.overview,
      monthly: fresh.overview.monthly.map((p, i, all) =>
        i >= all.length - 6 ? { ...p, count: 0, pos: 0, neg: 0, neu: 0, stars: [0, 0, 0, 0, 0] } : p,
      ),
    };
    renderFresh(zeroed);
    fireEvent.click(screen.getByRole("button", { name: "Last 6 months" }));
    expect(screen.getByText(/^No reviews between/)).toBeTruthy();
    expect(screen.queryByText(/NaN/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show all time" }));
    expect(screen.getByText("produce freshness")).toBeTruthy();
  });
});
