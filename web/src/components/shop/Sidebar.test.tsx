// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Shop } from "@/lib/data/schemas";
import { Sidebar } from "./Sidebar";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/shops/fresh/overview" }));

const fresh: Shop = {
  id: "fresh", name: "FreshCart Grocery", type: "grocery", isDemo: true, reviewCount: 10,
  dateRange: { from: "2026-01", to: "2026-10" }, unreadAlerts: 0,
};

describe("Sidebar", () => {
  it("marks the current page in the shop navigation", () => {
    render(<Sidebar shops={[fresh]} current={fresh} />);
    const link = screen.getByRole("link", { name: "Overview" });
    expect(link.getAttribute("href")).toBe("/shops/fresh/overview");
    expect(link.getAttribute("aria-current")).toBe("page");
  });

  it("shows no shop navigation when the shop is unknown", () => {
    render(<Sidebar shops={[fresh]} current={null} />);
    expect(screen.queryByRole("navigation", { name: "Shop pages" })).toBeNull();
  });
});
