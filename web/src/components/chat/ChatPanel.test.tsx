// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Review } from "@/lib/data/schemas";
import { ChatPanel } from "./ChatPanel";

const reviews: Review[] = [
  { id: "r1", date: "2026-10-01", stars: 1, text: "Waited an hour.", sentiment: "negative", confidence: 0.9, aspectMentions: [] },
];

function ndjson(lines: object[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        lines.forEach((l) => controller.enqueue(encoder.encode(`${JSON.stringify(l)}\n`)));
        controller.close();
      },
    }),
    { headers: { "content-type": "application/x-ndjson" } },
  );
}

afterEach(() => vi.unstubAllGlobals());
const renderPanel = () =>
  render(<ChatPanel shopId="s1" suggestions={["Why do customers complain?"]} reviews={reviews} aspectNames={{}} />);

describe("ChatPanel", () => {
  it("streams an answer with numbered citations and shows the cited review", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      ndjson([{ type: "text", text: "Wait time: " }, { type: "text", text: "mostly negative." }, { type: "citation", reviewId: "r1" }, { type: "done" }]),
    ));
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Why do customers complain?" }));
    await waitFor(() => expect(screen.getByText("Wait time: mostly negative.", { exact: false })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Source 1" })).toBeTruthy();
    expect(screen.getByText("Waited an hour.")).toBeTruthy();
  });

  it("shows the server's message when the request is rejected", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      Response.json({ error: { code: "VALIDATION_ERROR", message: "question: Keep questions under 500 characters", request_id: "x" } }, { status: 400 }),
    ));
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Why do customers complain?" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Keep questions under 500 characters"));
  });

  it("shows an error chunk from the stream with a way to try again", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ndjson([{ type: "text", text: "Partial " }, { type: "error", message: "The answer was interrupted." }])));
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Why do customers complain?" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("The answer was interrupted."));
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("treats a stream that ends without done as interrupted", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ndjson([{ type: "text", text: "Half an answer" }])));
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Why do customers complain?" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("interrupted"));
    expect((screen.getByRole("button", { name: "Why do customers complain?" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("keeps the send button disabled for a blank question", () => {
    renderPanel();
    expect((screen.getByRole("button", { name: "Ask" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByRole("textbox", { name: "Ask a question about these reviews" }), { target: { value: "   " } });
    expect((screen.getByRole("button", { name: "Ask" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
