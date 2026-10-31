import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { ChatChunkSchema } from "@/lib/data/schemas";
import { POST } from "./route";

const ctx = (shopId: string) => ({ params: Promise.resolve({ shopId }) }) as RouteContext<"/api/shops/[shopId]/ask">;
const post = (shopId: string, body: string) =>
  POST(new NextRequest(`http://test/api/shops/${shopId}/ask`, { method: "POST", body, headers: { "content-type": "application/json" } }), ctx(shopId));

describe("POST /api/shops/:shopId/ask", () => {
  it("streams NDJSON chat chunks ending with done", async () => {
    const res = await post("saffron-table", JSON.stringify({ question: "Why do customers complain?" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");
    const lines = (await res.text()).trim().split("\n").map((l) => ChatChunkSchema.parse(JSON.parse(l)));
    expect(lines.at(-1)).toEqual({ type: "done" });
    expect(lines.some((c) => c.type === "citation")).toBe(true);
  });

  it("rejects a blank question", async () => {
    const res = await post("saffron-table", JSON.stringify({ question: "   " }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toContain("Ask a question first");
  });

  it("rejects a malformed body", async () => {
    expect((await post("saffron-table", "{not json")).status).toBe(400);
  });

  it("returns 404 for an unknown shop", async () => {
    expect((await post("nope", JSON.stringify({ question: "hi" }))).status).toBe(404);
  });
});
