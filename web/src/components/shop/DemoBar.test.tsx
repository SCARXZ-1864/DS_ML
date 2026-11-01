// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Shop } from "@/lib/data/schemas";
import { DemoBar } from "./DemoBar";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const base: Shop = {
  id: "s", name: "S", type: "grocery", isDemo: true, reviewCount: 1,
  dateRange: { from: "2026-01", to: "2026-10" }, unreadAlerts: 0,
};

describe("DemoBar", () => {
  it("tells visitors they are looking at a demo shop", () => {
    render(<DemoBar shop={base} />);
    expect(screen.getByRole("note").textContent).toContain("You're viewing a demo shop");
  });

  it("invites visitors to upload their own reviews", () => {
    render(<DemoBar shop={base} />);
    expect(screen.getByRole("link", { name: /Upload your own reviews/ }).getAttribute("href")).toBe("/upload");
  });

  it("renders nothing for an owner's shop", () => {
    const { container } = render(<DemoBar shop={{ ...base, isDemo: false }} />);
    expect(container.innerHTML).toBe("");
  });
});
