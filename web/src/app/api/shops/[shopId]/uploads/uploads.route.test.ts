import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetStore } from "@/lib/data/mock/store";
import { UploadSchema } from "@/lib/data/schemas";
import { GET } from "./[uploadId]/route";
import { POST } from "./route";

const cookie = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "ri_session" && cookie.value ? { name, value: cookie.value } : undefined) }),
}));

const SHOP = "spice-indiranagar";
const body = { fileName: "new.csv", rows: [{ text: "Lovely" }, { text: "Too slow", stars: 2 }], skipped: { empty: 0, duplicate: 0, invalid: 0 } };

const post = (shopId: string, payload: unknown) =>
  POST(
    new NextRequest(`http://test/api/shops/${shopId}/uploads`, { method: "POST", body: JSON.stringify(payload) }),
    { params: Promise.resolve({ shopId }) } as RouteContext<"/api/shops/[shopId]/uploads">,
  );
const get = (shopId: string, uploadId: string) =>
  GET(
    new NextRequest(`http://test/api/shops/${shopId}/uploads/${uploadId}`),
    { params: Promise.resolve({ shopId, uploadId }) } as RouteContext<"/api/shops/[shopId]/uploads/[uploadId]">,
  );

beforeEach(() => {
  resetStore();
  cookie.value = undefined;
});

describe("POST /api/shops/:shopId/uploads", () => {
  it("asks a logged-out caller to log in, using the error contract", async () => {
    const res = await post(SHOP, body);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatchObject({ code: "UNAUTHORIZED", message: "Log in to upload reviews" });
    expect(res.headers.get("x-request-id")).toBe(json.error.request_id);
  });

  it("treats someone else's shop as not found", async () => {
    cookie.value = "u-other";
    const res = await post(SHOP, body);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatchObject({ code: "NOT_FOUND", message: "Shop not found" });
  });

  it("rejects an upload with no rows", async () => {
    cookie.value = "u-demo-owner";
    const res = await post(SHOP, { ...body, rows: [] });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a body that isn't JSON", async () => {
    cookie.value = "u-demo-owner";
    const res = await POST(
      new NextRequest(`http://test/api/shops/${SHOP}/uploads`, { method: "POST", body: "not json" }),
      { params: Promise.resolve({ shopId: SHOP }) } as RouteContext<"/api/shops/[shopId]/uploads">,
    );
    expect(res.status).toBe(400);
  });

  it("starts processing the owner's upload", async () => {
    cookie.value = "u-demo-owner";
    const res = await post(SHOP, body);
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(UploadSchema.parse(await res.json())).toMatchObject({ status: "processing", rowsAccepted: 2 });
  });
});

describe("GET /api/shops/:shopId/uploads/:uploadId", () => {
  it("returns the upload's progress to its owner", async () => {
    cookie.value = "u-demo-owner";
    const created = await (await post(SHOP, body)).json();
    const res = await get(SHOP, created.id);
    expect(res.status).toBe(200);
    expect(UploadSchema.parse(await res.json()).id).toBe(created.id);
  });

  it("returns 404 for an unknown upload", async () => {
    cookie.value = "u-demo-owner";
    expect((await get(SHOP, "up-nope")).status).toBe(404);
  });

  it("hides another owner's upload", async () => {
    cookie.value = "u-demo-owner";
    const created = await (await post(SHOP, body)).json();
    cookie.value = "u-other";
    expect((await get(SHOP, created.id)).status).toBe(404);
  });
});
