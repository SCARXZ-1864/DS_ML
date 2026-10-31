// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Shop } from "@/lib/data/schemas";
import { CommandPalette } from "./CommandPalette";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const shop = (id: string, name: string, type: Shop["type"]): Shop => ({
  id, name, type, isDemo: true, reviewCount: 1, dateRange: { from: "2026-01", to: "2026-10" }, unreadAlerts: 0,
});
const shops = [shop("fresh", "FreshCart Grocery", "grocery"), shop("volt", "VoltHome Appliances", "electronics")];

describe("CommandPalette", () => {
  it("opens with Ctrl+K and jumps to a page of the current shop", () => {
    render(<CommandPalette shops={shops} current={shops[0]} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByPlaceholderText("Jump to a page or shop…")).toBeTruthy();
    fireEvent.click(screen.getByText("Reviews"));
    expect(push).toHaveBeenCalledWith("/shops/fresh/reviews");
  });

  it("switches shop from the palette", () => {
    render(<CommandPalette shops={shops} current={shops[0]} />);
    fireEvent.click(screen.getByRole("button", { name: /Search/ }));
    fireEvent.click(screen.getByText("VoltHome Appliances"));
    expect(push).toHaveBeenCalledWith("/shops/volt/overview");
  });
});
