// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StarDonut } from "./StarDonut";

describe("StarDonut", () => {
  it("describes the rating mix for screen readers", () => {
    render(<StarDonut starMix={[1, 1, 2, 6, 10]} avgStars={4.15} />);
    const label = screen.getByRole("img").getAttribute("aria-label")!;
    expect(label).toContain("5 stars 50%");
    expect(label).toContain("1 star 5%");
    expect(label).toContain("Average 4.15");
  });

  it("says so when the data has no star ratings", () => {
    render(<StarDonut starMix={null} avgStars={null} />);
    expect(screen.getByText("No star ratings in this data.")).toBeTruthy();
  });
});
