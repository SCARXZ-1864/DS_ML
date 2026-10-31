// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ShareLink } from "@/lib/data/schemas";
import { LinkList } from "./LinkList";

const link: ShareLink = {
  token: "test-link-token", shopId: "s1", period: "90d", sections: ["overview", "aspects"],
  createdAt: "2026-10-20T09:00:00.000Z", views: 7, revokedAt: null,
};

afterEach(() => vi.unstubAllGlobals());

describe("LinkList", () => {
  it("revokes a link after confirming, then disables Copy", async () => {
    const revoke = vi.fn(async () => ({ ok: true }));
    const { rerender } = render(<LinkList links={[link]} origin="https://ri.example" revokeAction={revoke} />);
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, revoke" }));
    await waitFor(() => expect(revoke).toHaveBeenCalledWith("s1", "test-link-token"));

    rerender(<LinkList links={[{ ...link, revokedAt: "2026-10-31T10:00:00.000Z" }]} origin="https://ri.example" revokeAction={revoke} />);
    expect(screen.getByText("Revoked")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Copy" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("link", { name: "Open" })).toBeNull();
  });

  it("copies the full link and says so", async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<LinkList links={[link]} origin="https://ri.example" revokeAction={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://ri.example/r/test-link-token"));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeTruthy();
  });

  it("shows the period, sections and views of each link", () => {
    render(<LinkList links={[link]} origin="https://ri.example" revokeAction={vi.fn()} />);
    expect(screen.getByText(/Last 90 days · Overview, Aspects/)).toBeTruthy();
    expect(screen.getByText("7 views")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open" }).getAttribute("href")).toBe("/r/test-link-token");
  });

  it("says when there are no links yet", () => {
    render(<LinkList links={[]} origin="https://ri.example" revokeAction={vi.fn()} />);
    expect(screen.getByText(/No share links yet/)).toBeTruthy();
  });
});
