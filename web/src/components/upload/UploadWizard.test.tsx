// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Upload } from "@/lib/data/schemas";
import { UploadWizard } from "./UploadWizard";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const STAGE_NAMES = ["Reading file", "Cleaning rows", "Scoring sentiment", "Finding aspects", "Updating dashboard"];
const upload = (status: Upload["status"], over: Partial<Upload> = {}): Upload => ({
  id: "up-1", shopId: "s1", fileName: "r.csv", createdAt: "2026-10-31T10:00:00.000Z", status,
  rowsAccepted: 2, rowsSkipped: { empty: 0, duplicate: 0, invalid: 0 },
  stages: STAGE_NAMES.map((name, i) => ({ name, status: status === "done" ? "done" : i === 0 ? "running" : "pending" })),
  changes: [], ...over,
});

const chooseFile = async (name: string, content: string) => {
  const input = screen.getByLabelText("Choose a CSV file") as HTMLInputElement;
  await act(async () => {
    fireEvent.change(input, { target: { files: [new File([content], name, { type: "text/csv" })] } });
  });
};

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("UploadWizard", () => {
  it("blocks Next until a column is marked as the review text", async () => {
    render(<UploadWizard shopId="s1" />);
    await chooseFile("codes.csv", "id,code\n1,A1\n2,B2\n");
    const next = await screen.findByRole("button", { name: "Next" });
    expect((next as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Pick the column that holds the review text.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/code”/), { target: { value: "text" } });
    expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("walks from file to processing to what changed", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(upload("processing"), { status: 201 }))
      .mockResolvedValueOnce(Response.json(upload("processing")))
      .mockResolvedValue(
        Response.json(upload("done", { changes: [{ kind: "rise", aspectId: "wait", deltaPct: 8, note: "Complaints about Wait time rose 8 points" }] })),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<UploadWizard shopId="s1" />);
    await chooseFile("r.csv", "Review,Rating\nLovely staff and quick service,5\nWaited far too long today,2\n");
    fireEvent.click(await screen.findByRole("button", { name: "Next" }));
    expect(await screen.findByText("Lovely staff and quick service")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start import" }));

    expect(await screen.findByText("Scoring sentiment")).toBeTruthy();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/shops/s1/uploads");
    expect(JSON.parse(init.body as string)).toMatchObject({
      fileName: "r.csv",
      rows: [{ text: "Lovely staff and quick service", stars: 5 }, { text: "Waited far too long today", stars: 2 }],
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    expect(await screen.findByText("Complaints about Wait time rose 8 points")).toBeTruthy();
    expect(screen.getByRole("link", { name: "View dashboard" }).getAttribute("href")).toBe("/shops/s1/overview");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/shops/s1/uploads/up-1");
  });

  it("stops polling when the page is left mid-processing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(upload("processing"), { status: 201 }))
      .mockResolvedValue(Response.json(upload("processing")));
    vi.stubGlobal("fetch", fetchMock);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(<UploadWizard shopId="s1" />);
    await chooseFile("r.csv", "Review\nLovely staff and quick service\n");
    fireEvent.click(await screen.findByRole("button", { name: "Next" }));
    fireEvent.click(await screen.findByRole("button", { name: "Start import" }));
    await screen.findByText("Scoring sentiment");
    unmount();
    const calls = fetchMock.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fetchMock.mock.calls.length).toBe(calls);
    expect(error).not.toHaveBeenCalled();
  });

  it("shows a failed stage with a way to start again", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json(upload("failed", { error: "The sentiment model didn't respond." }), { status: 201 })),
    );
    render(<UploadWizard shopId="s1" />);
    await chooseFile("fail.csv", "Review\nLovely staff and quick service\n");
    fireEvent.click(await screen.findByRole("button", { name: "Next" }));
    fireEvent.click(await screen.findByRole("button", { name: "Start import" }));
    expect((await screen.findByRole("alert")).textContent).toContain("The sentiment model didn't respond.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByLabelText("Choose a CSV file")).toBeTruthy();
  });

  it("refuses a file that isn't a CSV", async () => {
    render(<UploadWizard shopId="s1" />);
    await chooseFile("bad.xlsx", "x");
    expect((await screen.findByRole("alert")).textContent).toContain("Upload a .csv file.");
  });

  it("shows the server's message when starting the import fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ error: { code: "UNAUTHORIZED", message: "Log in to upload reviews", request_id: "r" } }, { status: 401 })),
    );
    render(<UploadWizard shopId="s1" />);
    await chooseFile("r.csv", "Review\nLovely staff and quick service\n");
    fireEvent.click(await screen.findByRole("button", { name: "Next" }));
    fireEvent.click(await screen.findByRole("button", { name: "Start import" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Log in to upload reviews"));
  });
});
