// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Prediction } from "@/lib/data/schemas";
import { LiveAnalyzer } from "./LiveAnalyzer";

const prediction: Prediction = {
  sentiment: "negative", score: -0.6, confidence: 0.8,
  tokens: [{ text: "Food", aspectId: "food" }, { text: " " }, { text: "terrible", tone: "negative" }],
  aspects: [{ id: "food", name: "Food", sentiment: "negative" }],
};

afterEach(() => vi.unstubAllGlobals());

describe("LiveAnalyzer", () => {
  it("analyses text after a pause in typing", async () => {
    const fetchMock = vi.fn(async () => Response.json(prediction));
    vi.stubGlobal("fetch", fetchMock);
    render(<LiveAnalyzer shopId="s1" examples={[]} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Review text" }), { target: { value: "Food terrible" } });
    await waitFor(() => expect(screen.getByText(/negative · confidence 0\.80/)).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({ text: "Food terrible" });
    expect(screen.getByText("terrible").className).toContain("text-neg");
    expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe("-0.6");
    expect(screen.getByText("− Food")).toBeTruthy();
  });

  it("fills the box from an example", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(prediction)));
    render(<LiveAnalyzer shopId="s1" examples={["The food was terrible."]} />);
    fireEvent.click(screen.getByRole("button", { name: "The food was terrible." }));
    expect((screen.getByRole("textbox", { name: "Review text" }) as HTMLTextAreaElement).value).toBe("The food was terrible.");
  });

  it("does not call the server for blank text", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<LiveAnalyzer shopId="s1" examples={[]} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Review text" }), { target: { value: "   " } });
    await new Promise((r) => setTimeout(r, 500));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops showing progress when the box is cleared mid-request", async () => {
    vi.stubGlobal("fetch", vi.fn((_u: string, init?: RequestInit) => new Promise<Response>((resolve, reject) => {
      const t = setTimeout(() => resolve(Response.json(prediction)), 1000);
      init?.signal?.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("Aborted", "AbortError")); });
    })));
    render(<LiveAnalyzer shopId="s1" examples={[]} />);
    const box = screen.getByRole("textbox", { name: "Review text" });
    fireEvent.change(box, { target: { value: "Food terrible" } });
    await waitFor(() => expect(screen.getByText("Analysing…")).toBeTruthy());
    fireEvent.change(box, { target: { value: "" } });
    await waitFor(() => expect(screen.queryByText("Analysing…")).toBeNull());
  });

  it("shows an error with a retry", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ error: { code: "INTERNAL_ERROR", message: "boom", request_id: "r" } }, { status: 500 }))
      .mockResolvedValueOnce(Response.json(prediction));
    vi.stubGlobal("fetch", fetchMock);
    render(<LiveAnalyzer shopId="s1" examples={[]} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Review text" }), { target: { value: "Food terrible" } });
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Couldn't analyse"));
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByRole("meter")).toBeTruthy());
  });
});
