// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Review } from "@/lib/data/schemas";
import { ReviewCard } from "./ReviewCard";

const review: Review = {
  id: "r1", date: "2026-10-04", stars: 2, text: "Box arrived crushed <b>again</b>", sentiment: "negative", confidence: 0.9, helpful: 4,
  aspectMentions: [{ aspectId: "packaging", start: 0, end: 19, sentiment: "negative" }],
};

describe("ReviewCard", () => {
  it("shows stars, date, sentiment and highlighted aspect text", () => {
    const { container } = render(<ReviewCard review={review} aspectNames={{ packaging: "Packaging" }} />);
    expect(screen.getByLabelText("2 out of 5 stars")).toBeTruthy();
    expect(screen.getByText("4 Oct 2026")).toBeTruthy();
    expect(screen.getByText("negative")).toBeTruthy();
    const mark = container.querySelector("mark")!;
    expect(mark.textContent).toBe("Box arrived crushed");
    expect(mark.getAttribute("title")).toBe("Packaging");
    expect(screen.getByText("4 found this helpful")).toBeTruthy();
  });

  it("renders markup in review text as plain text", () => {
    const { container } = render(<ReviewCard review={review} aspectNames={{}} />);
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toContain("<b>again</b>");
  });

  it("says when a review has no star rating", () => {
    render(<ReviewCard review={{ ...review, stars: null }} aspectNames={{}} />);
    expect(screen.getByText("No rating")).toBeTruthy();
  });
});
