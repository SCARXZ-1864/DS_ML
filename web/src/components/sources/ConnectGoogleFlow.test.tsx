// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { GoogleLocation } from "@/lib/data/schemas";
import { ConnectGoogleFlow } from "./ConnectGoogleFlow";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const locations: GoogleLocation[] = [
  { id: "loc-1", name: "Corner Bakery", address: "12 MG Road" },
  { id: "loc-2", name: "Corner Bakery · Kiosk", address: "Mall, level 2" },
];

describe("ConnectGoogleFlow", () => {
  it("asks for consent first, then which location to import", () => {
    render(<ConnectGoogleFlow shopId="s1" shopName="Corner Bakery" locations={locations} connectAction={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Simulated Google consent" })).toBeTruthy();
    expect(screen.queryByRole("radio")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Allow" }));
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("enables Import only after a location is chosen, and sends that location", async () => {
    const connect = vi.fn(async () => ({ ok: true }));
    render(<ConnectGoogleFlow shopId="s1" shopName="Corner Bakery" locations={locations} connectAction={connect} />);
    fireEvent.click(screen.getByRole("button", { name: "Allow" }));
    const importButton = screen.getByRole("button", { name: "Import reviews" }) as HTMLButtonElement;
    expect(importButton.disabled).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: /Kiosk/ }));
    expect(importButton.disabled).toBe(false);
    fireEvent.click(importButton);
    await waitFor(() => expect(connect).toHaveBeenCalledWith("s1", "loc-2"));
  });

  it("shows the action's error", async () => {
    const connect = vi.fn(async () => ({ ok: false, message: "Pick one of your locations." }));
    render(<ConnectGoogleFlow shopId="s1" shopName="Corner Bakery" locations={locations} connectAction={connect} />);
    fireEvent.click(screen.getByRole("button", { name: "Allow" }));
    fireEvent.click(screen.getByRole("radio", { name: /Kiosk/ }));
    fireEvent.click(screen.getByRole("button", { name: "Import reviews" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Pick one of your locations.");
  });

  it("goes back to Sources on Cancel", () => {
    render(<ConnectGoogleFlow shopId="s1" shopName="Corner Bakery" locations={locations} connectAction={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Cancel" }).getAttribute("href")).toBe("/shops/s1/sources");
  });
});
