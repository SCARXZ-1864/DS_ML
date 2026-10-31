// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Shop } from "@/lib/data/schemas";
import { EmptyShop } from "./EmptyShop";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const shop: Shop = {
  id: "new-shop", name: "New Shop", type: "salon", isDemo: false, reviewCount: 0,
  dateRange: { from: "2026-10", to: "2026-10" }, unreadAlerts: 0,
};

describe("EmptyShop", () => {
  it("offers the owner both ways to bring in reviews", () => {
    render(<EmptyShop shop={shop} canManage />);
    expect(screen.getByRole("heading", { name: "No reviews yet" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Connect Google Business Profile" }).getAttribute("href")).toBe("/shops/new-shop/sources/connect");
    expect(screen.getByRole("link", { name: "Upload a CSV" }).getAttribute("href")).toBe("/shops/new-shop/uploads/new");
  });

  it("shows no actions to someone who can't manage the shop", () => {
    render(<EmptyShop shop={shop} canManage={false} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
