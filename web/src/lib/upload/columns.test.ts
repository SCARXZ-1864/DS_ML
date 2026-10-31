import { describe, expect, it } from "vitest";
import { guessColumns } from "./columns";

const roles = (header: string[], rows: string[][]) => guessColumns(header, rows).map((g) => g.role);

describe("guessColumns", () => {
  it("recognises date, rating and review columns by name", () => {
    const rows = [["2026-10-01", "4", "Lovely staff and quick service overall"], ["2026-10-02", "2", "Too slow at the counter today, sadly"]];
    expect(roles(["Date", "Rating", "Review"], rows)).toEqual(["date", "stars", "text"]);
  });

  it("picks the long free-text column as the text when no name hints at it", () => {
    const rows = [["1", "Really enjoyed the visit, will come back again"], ["2", "The place was crowded and noisy on Saturday"]];
    expect(roles(["id", "what they said"], rows)).toEqual(["ignore", "text"]);
  });

  it("doesn't treat a rating-named column of words as stars", () => {
    const rows = [["great", "Nice and tidy shop with helpful people"], ["bad", "Waited a long time for help and left"]];
    expect(roles(["Rating", "Comment"], rows)[0]).toBe("ignore");
  });

  it("gives each role to one column at most", () => {
    const rows = [["Good value for money here", "Staff were polite and quick"]];
    expect(roles(["review", "comment"], rows)).toEqual(["text", "ignore"]);
  });

  it("shows up to three non-empty samples", () => {
    const [g] = guessColumns(["review"], [["a long enough review text"], [""], ["b"], ["c"], ["d"]]);
    expect(g.samples).toEqual(["a long enough review text", "b", "c"]);
  });
});
