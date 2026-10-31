import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { PredictionSchema } from "@/lib/data/schemas";
import { POST } from "./route";

const ctx = (shopId: string) => ({ params: Promise.resolve({ shopId }) }) as RouteContext<"/api/shops/[shopId]/predict">;
const post = (shopId: string, body: unknown) =>
  POST(new NextRequest(`http://test/api/shops/${shopId}/predict`, { method: "POST", body: JSON.stringify(body) }), ctx(shopId));

describe("POST /api/shops/:shopId/predict", () => {
  it("returns a prediction", async () => {
    const res = await post("freshcart", { text: "Bread was stale and delivery was late." });
    expect(res.status).toBe(200);
    expect(PredictionSchema.parse(await res.json()).sentiment).toBe("negative");
  });

  it("rejects text over 2,000 characters", async () => {
    const res = await post("freshcart", { text: "a".repeat(2001) });
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toContain("2,000");
  });

  it("returns 404 for an unknown shop", async () => {
    expect((await post("nope", { text: "hi" })).status).toBe(404);
  });
});
