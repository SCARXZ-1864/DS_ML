// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AspectBars } from "./AspectBars";

describe("AspectBars", () => {
  it("draws one row per aspect from the data, with a spoken summary", () => {
    render(
      <AspectBars
        rows={[
          { id: "fresh", name: "Freshness", mentions: 40, posPct: 35, negPct: 47 },
          { id: "price", name: "Price", mentions: 30, posPct: 72, negPct: 10 },
        ]}
      />,
    );
    expect(screen.getByText("Freshness: 35% positive, 47% negative, net −12")).toBeTruthy();
    expect(screen.getByText("Price: 72% positive, 10% negative, net +62")).toBeTruthy();
  });

  it("truncates a very long aspect name and keeps it as a tooltip", () => {
    const long = "Very long aspect name that keeps going well past the column width";
    render(<AspectBars rows={[{ id: "x", name: long, mentions: 3, posPct: 50, negPct: 50 }]} />);
    expect(screen.getByTitle(long).className).toContain("truncate");
  });

  it("explains an empty list", () => {
    render(<AspectBars rows={[]} />);
    expect(screen.getByText("No aspects mentioned in this range.")).toBeTruthy();
  });

  it("turns rows into buttons when a row can be selected", () => {
    const onSelect = vi.fn();
    render(<AspectBars rows={[{ id: "price", name: "Price", mentions: 30, posPct: 72, negPct: 10 }]} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Price: 72% positive/ }));
    expect(onSelect).toHaveBeenCalledWith("price");
  });
});
