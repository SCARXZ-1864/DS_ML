import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as ask } from "./ask/route";
import { POST as predict } from "./predict/route";
import { GET as reviews } from "./reviews/route";

// The analytics API must follow the same access rule as the pages: anyone may read a demo
// shop, but an owner shop only by its owner (no session → 401, anyone else → 404).

const cookie = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "ri_session" && cookie.value ? { name, value: cookie.value } : undefined) }),
}));

const OWNER_SHOP = "spice-indiranagar";
const params = (shopId: string) => ({ params: Promise.resolve({ shopId }) });
const json = (body: unknown) => ({ method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });

const calls = {
  reviews: (shopId: string) =>
    reviews(new NextRequest(`http://test/api/shops/${shopId}/reviews`), params(shopId) as RouteContext<"/api/shops/[shopId]/reviews">),
  ask: (shopId: string) =>
    ask(new NextRequest(`http://test/api/shops/${shopId}/ask`, json({ question: "Why?" })), params(shopId) as RouteContext<"/api/shops/[shopId]/ask">),
  predict: (shopId: string) =>
    predict(new NextRequest(`http://test/api/shops/${shopId}/predict`, json({ text: "Slow service" })), params(shopId) as RouteContext<"/api/shops/[shopId]/predict">),
};

beforeEach(() => {
  cookie.value = undefined;
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe.each(Object.entries(calls))("%s API access", (_name, call) => {
  it("asks a logged-out caller to log in for an owner shop", async () => {
    const res = await call(OWNER_SHOP);
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("treats another user's shop as not found", async () => {
    cookie.value = "u-other";
    const res = await call(OWNER_SHOP);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatchObject({ code: "NOT_FOUND", message: "Shop not found" });
  });

  it("serves the owner", async () => {
    cookie.value = "u-demo-owner";
    expect((await call(OWNER_SHOP)).status).toBe(200);
  });

  it("still serves a demo shop to anyone", async () => {
    expect((await call("saffron-table")).status).toBe(200);
  });
});
