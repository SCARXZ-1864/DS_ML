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
vi.mock("next/navigation", () => ({ usePathname: () => "/shops/fresh/overview", useRouter: () => ({ push: vi.fn() }) }));

const fresh: Shop = {
  id: "fresh", name: "FreshCart Grocery", type: "grocery", isDemo: true, reviewCount: 10,
  dateRange: { from: "2026-01", to: "2026-10" }, unreadAlerts: 0,
};

describe("Sidebar", () => {
  it("marks the current page in the shop navigation", () => {
    render(<Sidebar shops={[fresh]} current={fresh} canManage={false} user={null} />);
    const link = screen.getByRole("link", { name: "Overview" });
    expect(link.getAttribute("href")).toBe("/shops/fresh/overview");
    expect(link.getAttribute("aria-current")).toBe("page");
  });

  it("links to the issue pages right after the overview", () => {
    render(<Sidebar shops={[fresh]} current={fresh} canManage={false} user={null} />);
    const nav = screen.getByRole("navigation", { name: "Shop pages" });
    const names = [...nav.querySelectorAll("a")].map((a) => a.textContent);
    expect(names.slice(0, 3)).toEqual(["Overview", "What to fix first", "Issues"]);
    expect(screen.getByRole("link", { name: "Issues" }).getAttribute("href")).toBe("/shops/fresh/issues");
  });

  it("offers review upload to everyone, logged in or not", () => {
    const { rerender } = render(<Sidebar shops={[fresh]} current={fresh} canManage={false} user={null} />);
    expect(screen.getByRole("link", { name: "Upload reviews" }).getAttribute("href")).toBe("/upload");
    rerender(<Sidebar shops={[fresh]} current={null} canManage={false} user={{ name: "Ann" }} />);
    expect(screen.getByRole("link", { name: "Upload reviews" }).getAttribute("href")).toBe("/upload");
  });

  it("shows no shop navigation when the shop is unknown", () => {
    render(<Sidebar shops={[fresh]} current={null} canManage={false} user={null} />);
    expect(screen.queryByRole("navigation", { name: "Shop pages" })).toBeNull();
  });

  it("hides the manage pages on a shop the viewer can't manage", () => {
    render(<Sidebar shops={[fresh]} current={fresh} canManage={false} user={null} />);
    expect(screen.queryByRole("link", { name: /Uploads/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Log in" }).getAttribute("href")).toBe("/login");
  });

  it("shows the four manage pages and account links to the owner", () => {
    const own = { ...fresh, id: "own", isDemo: false, unreadAlerts: 2 };
    render(<Sidebar shops={[own]} current={own} canManage user={{ name: "Demo owner" }} />);
    for (const name of ["Sources", "Uploads", "Share"]) {
      expect(screen.getByRole("link", { name }).getAttribute("href")).toBe(`/shops/own/${name.toLowerCase()}`);
    }
    expect(screen.getByRole("link", { name: /Alerts/ }).textContent).toContain("2");
    expect(screen.getByRole("link", { name: "My shops" }).getAttribute("href")).toBe("/app");
    expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();
  });
});
