// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildDb } from "@/lib/data/mock/build";
import { SHOP_DEFS } from "@/lib/data/mock/shops";
import { AspectsView } from "./AspectsView";

const volt = buildDb(SHOP_DEFS).get("volthome")!;

describe("AspectsView", () => {
  it("opens a drawer with the reviews behind an aspect and closes it", () => {
    render(<AspectsView shop={volt.shop} aspects={volt.aspects} reviews={volt.reviews} />);
    fireEvent.click(screen.getByRole("button", { name: /^Installation:/ }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.hasAttribute("open")).toBe(true);
    expect(screen.getByRole("heading", { level: 2, name: "Installation" })).toBeTruthy();
    // The highlight splits the sentence across elements, so check the dialog's whole text.
    expect(dialog.textContent).toContain("Fridge is fine but installation was postponed three times.");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("heading", { level: 2, name: "Installation" })).toBeNull();
  });

  it("explains when a shop has no aspects yet", () => {
    render(<AspectsView shop={volt.shop} aspects={[]} reviews={[]} />);
    expect(screen.getByText(/No aspects found yet/)).toBeTruthy();
  });
});
