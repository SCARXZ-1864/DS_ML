// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Shop } from "@/lib/data/schemas";
import { ShopSwitcher } from "./ShopSwitcher";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const shop = (id: string, name: string, isDemo: boolean, type: Shop["type"] = "restaurant"): Shop => ({
  id, name, type, isDemo, reviewCount: 10, dateRange: { from: "2026-01", to: "2026-10" }, unreadAlerts: 0,
});
const shops = [shop("mine", "My Cafe", false), shop("fresh", "FreshCart Grocery", true, "grocery")];

describe("ShopSwitcher", () => {
  it("opens a grouped menu, marks the current shop and closes on Escape", () => {
    render(<ShopSwitcher shops={shops} currentId="fresh" />);
    const toggle = screen.getByRole("button", { name: /FreshCart Grocery/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Your shops")).toBeTruthy();
    expect(screen.getByText("Demo shops")).toBeTruthy();
    expect(screen.getByRole("link", { name: /My Cafe/ }).getAttribute("href")).toBe("/shops/mine/overview");
    expect(screen.getByRole("link", { name: /FreshCart Grocery/ }).getAttribute("aria-current")).toBe("page");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("hides 'Your shops' when there are no owned shops", () => {
    render(<ShopSwitcher shops={[shops[1]]} currentId="fresh" />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByText("Your shops")).toBeNull();
  });
});
