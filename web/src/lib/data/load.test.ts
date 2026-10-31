import { beforeEach, describe, expect, it, vi } from "vitest";

const cookie = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "ri_session" && cookie.value ? { name, value: cookie.value } : undefined) }),
}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { loadShopForViewer, ownerGuard } from "./load";

const OWNER_PAGE = "/shops/spice-indiranagar/overview";

beforeEach(() => {
  cookie.value = undefined;
});

describe("loadShopForViewer", () => {
  it("returns a demo shop to a logged-out visitor, without manage rights", async () => {
    const res = await loadShopForViewer("freshcart", "/shops/freshcart/overview");
    expect(res.shop.name).toBe("FreshCart Grocery");
    expect(res.canManage).toBe(false);
  });

  it("shows the not-found page for an unknown shop id", async () => {
    await expect(loadShopForViewer("no-such-shop", "/x")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("sends a logged-out visitor on an owner shop to the login page", async () => {
    await expect(loadShopForViewer("spice-indiranagar", OWNER_PAGE)).rejects.toThrow(
      "REDIRECT:/login?next=%2Fshops%2Fspice-indiranagar%2Foverview",
    );
  });

  it("shows another user 'Shop not found'", async () => {
    cookie.value = "u-other";
    await expect(loadShopForViewer("spice-indiranagar", OWNER_PAGE)).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("gives the owner manage rights", async () => {
    cookie.value = "u-demo-owner";
    const res = await loadShopForViewer("spice-indiranagar", OWNER_PAGE);
    expect(res).toMatchObject({ viewerId: "u-demo-owner", canManage: true });
  });

  it("hides owner-only pages on a demo shop", async () => {
    cookie.value = "u-demo-owner";
    await expect(loadShopForViewer("freshcart", "/shops/freshcart/uploads", { ownerOnly: true })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("ownerGuard", () => {
  it("rejects a request with no session", async () => {
    expect(await ownerGuard("spice-indiranagar")).toEqual({ error: "UNAUTHORIZED" });
  });

  it("treats another user's shop as missing", async () => {
    cookie.value = "u-other";
    expect(await ownerGuard("spice-indiranagar")).toEqual({ error: "NOT_FOUND" });
  });

  it("treats a demo shop as not manageable", async () => {
    cookie.value = "u-demo-owner";
    expect(await ownerGuard("freshcart")).toEqual({ error: "NOT_FOUND" });
  });

  it("lets the owner through", async () => {
    cookie.value = "u-demo-owner";
    expect(await ownerGuard("spice-indiranagar")).toEqual({ userId: "u-demo-owner" });
  });
});
