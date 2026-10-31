// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Shop } from "@/lib/data/schemas";
import { ShopCard } from "./ShopCard";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const shop: Shop = {
  id: "own", name: "Corner Bakery", type: "other", isDemo: false, reviewCount: 1240,
  dateRange: { from: "2026-01", to: "2026-10" }, unreadAlerts: 2,
};

describe("ShopCard", () => {
  it("links to the shop and shows its review count and unread alerts", () => {
    render(<ShopCard shop={shop} monthlyCounts={[3, 5, 8]} />);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/shops/own/overview");
    expect(screen.getByText("1,240")).toBeTruthy();
    expect(screen.getByText("2 new alerts")).toBeTruthy();
  });

  it("says when a shop has no reviews yet", () => {
    render(<ShopCard shop={{ ...shop, reviewCount: 0, unreadAlerts: 0 }} monthlyCounts={null} />);
    expect(screen.getByText("No reviews yet")).toBeTruthy();
    expect(screen.queryByText(/new alert/)).toBeNull();
  });
});
