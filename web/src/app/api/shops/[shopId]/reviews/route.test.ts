import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReviewPageSchema } from "@/lib/data/schemas";
import { GET } from "./route";

afterEach(() => vi.restoreAllMocks());
const ctx = (shopId: string) => ({ params: Promise.resolve({ shopId }) }) as RouteContext<"/api/shops/[shopId]/reviews">;
const get = (shopId: string, qs = "") => GET(new NextRequest(`http://test/api/shops/${shopId}/reviews${qs}`), ctx(shopId));

describe("GET /api/shops/:shopId/reviews", () => {
  it("returns a filtered page that follows the contract", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await get("freshcart", "?sentiment=negative&limit=5");
    expect(res.status).toBe(200);
    const page = ReviewPageSchema.parse(await res.json());
    expect(page.items).toHaveLength(5);
    page.items.forEach((r) => expect(r.sentiment).toBe("negative"));
  });

  it("ignores empty parameters", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    expect((await get("freshcart", "?sentiment=&search=")).status).toBe(200);
  });

  it("rejects invalid parameters with a validation error", async () => {
    const res = await get("freshcart", "?limit=999");
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 for an unknown shop", async () => {
    const res = await get("nope");
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });
});
