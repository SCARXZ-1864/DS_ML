// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildDb } from "@/lib/data/mock/build";
import { SHOP_DEFS } from "@/lib/data/mock/shops";
import { TopicsView } from "./TopicsView";

// Saffron Table has a clear complaint topic (wait time), so the filter test has something to show.
const fresh = buildDb(SHOP_DEFS).get("saffron-table")!;
const renderView = () => render(<TopicsView shop={fresh.shop} topics={fresh.topics} reviews={fresh.reviews} />);

describe("TopicsView", () => {
  it("draws one selectable bubble per topic and shows the biggest topic first", () => {
    renderView();
    expect(screen.getAllByRole("button", { name: /reviews,/ })).toHaveLength(fresh.topics.length);
    expect(screen.getByRole("heading", { level: 2, name: fresh.topics[0].label })).toBeTruthy();
  });

  it("shows a topic's details when its bubble is chosen", () => {
    renderView();
    const target = fresh.topics[2];
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${target.label}`) }));
    expect(screen.getByRole("heading", { level: 2, name: target.label })).toBeTruthy();
    target.keywords.forEach((k) => expect(screen.getAllByText(k).length).toBeGreaterThan(0));
  });

  it("describes the complaint share without contradicting the aspects page", () => {
    renderView();
    const panel = screen.getByRole("heading", { level: 2 }).closest("section")!;
    expect(panel.textContent).toMatch(/of opinions are negative/);
    expect(panel.textContent).not.toMatch(/% positive/);
  });

  it("shows a visible focus ring on bubbles for keyboard users", () => {
    renderView();
    const bubble = screen.getAllByRole("button", { name: /reviews,/ })[0];
    expect(bubble.querySelector("circle")!.getAttribute("class")).toContain("group-focus-visible:stroke-accent");
  });

  it("filters to complaint topics", () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Mostly complaints" }));
    const complaints = fresh.topics.filter((t) => t.negShare >= 0.5);
    expect(complaints.length).toBeGreaterThan(0);
    expect(complaints.length).toBeLessThan(fresh.topics.length);
    expect(screen.queryAllByRole("button", { name: /reviews,/ })).toHaveLength(complaints.length);
  });
});
