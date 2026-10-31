// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Review, ReviewPage } from "@/lib/data/schemas";
import { ReviewExplorer } from "./ReviewExplorer";

const review = (id: string, text: string, sentiment: Review["sentiment"] = "positive"): Review => ({
  id, date: "2026-10-01", stars: 4, text, sentiment, confidence: 0.9, aspectMentions: [],
});
const page = (items: Review[], total = items.length, nextCursor: string | null = null): ReviewPage => ({ items, total, nextCursor });
const aspects = [{ id: "food", name: "Food", mentions: 1, posPct: 1, negPct: 1, neuPct: 1, monthly: [], exampleReviewIds: [] }];

afterEach(() => vi.unstubAllGlobals());

function renderExplorer(initial = page([review("1", "First review")], 2, "1")) {
  render(<ReviewExplorer shopId="s1" aspects={aspects} initial={initial} />);
}

describe("ReviewExplorer", () => {
  it("shows the first page and the total", () => {
    renderExplorer();
    expect(screen.getByText("First review")).toBeTruthy();
    expect(screen.getByText("2 reviews")).toBeTruthy();
  });

  it("refetches with the chosen sentiment", async () => {
    const fetchMock = vi.fn(async () => Response.json(page([review("9", "Cold food", "negative")])));
    vi.stubGlobal("fetch", fetchMock);
    renderExplorer();
    fireEvent.click(screen.getByRole("button", { name: "Negative" }));
    await waitFor(() => expect(screen.getByText("Cold food")).toBeTruthy());
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain("/api/shops/s1/reviews?sentiment=negative");
  });

  it("shows only the latest filters' results when responses arrive out of order", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
      const slow = url.includes("sentiment=negative");
      return new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(() => resolve(Response.json(page([review(slow ? "n" : "p", slow ? "Slow negative" : "Fast positive")]))), slow ? 150 : 10);
        init?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    }));
    renderExplorer();
    fireEvent.click(screen.getByRole("button", { name: "Negative" }));
    fireEvent.click(screen.getByRole("button", { name: "Positive" }));
    await waitFor(() => expect(screen.getByText("Fast positive")).toBeTruthy());
    await new Promise((r) => setTimeout(r, 200));
    expect(screen.queryByText("Slow negative")).toBeNull();
  });

  it("shows an empty state and clears filters", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json(page([])))
      .mockResolvedValueOnce(Response.json(page([review("1", "First review")])));
    vi.stubGlobal("fetch", fetchMock);
    renderExplorer();
    fireEvent.click(screen.getByRole("button", { name: "Neutral" }));
    await waitFor(() => expect(screen.getByText("No reviews match these filters.")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(screen.getByText("First review")).toBeTruthy());
    expect(String(fetchMock.mock.calls[1][0])).not.toContain("sentiment=");
  });

  it("shows an error with a retry", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ error: { code: "INTERNAL_ERROR", message: "boom", request_id: "r" } }, { status: 500 }))
      .mockResolvedValueOnce(Response.json(page([review("5", "Back again")])));
    vi.stubGlobal("fetch", fetchMock);
    renderExplorer();
    fireEvent.click(screen.getByRole("button", { name: "Negative" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Couldn't load reviews"));
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByText("Back again")).toBeTruthy());
  });

  it("loads more reviews onto the list", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(page([review("2", "Second review")], 2, null))));
    renderExplorer();
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() => expect(screen.getByText("Second review")).toBeTruthy());
    expect(screen.getByText("First review")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  it("drops an in-flight Load more when the filters change", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
      const isLoadMore = url.includes("cursor=");
      return new Promise<Response>((resolve, reject) => {
        const t = setTimeout(() => resolve(Response.json(page([review(isLoadMore ? "old" : "neg", isLoadMore ? "Old page item" : "Neg item", "negative")]))), isLoadMore ? 150 : 10);
        init?.signal?.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("Aborted", "AbortError")); });
      });
    }));
    renderExplorer();
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    fireEvent.click(screen.getByRole("button", { name: "Negative" }));
    await waitFor(() => expect(screen.getByText("Neg item")).toBeTruthy());
    await new Promise((r) => setTimeout(r, 250));
    expect(screen.queryByText("Old page item")).toBeNull();
  });

  it("searches after a short pause in typing", async () => {
    const fetchMock = vi.fn(async () => Response.json(page([review("7", "Stale bread")])));
    vi.stubGlobal("fetch", fetchMock);
    renderExplorer();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search reviews" }), { target: { value: "bread" } });
    await waitFor(() => expect(screen.getByText("Stale bread")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain("search=bread");
  });
});
