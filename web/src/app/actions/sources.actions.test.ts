import { beforeEach, describe, expect, it, vi } from "vitest";
import { listSourcesAt } from "@/lib/data/mock/sources";
import { resetStore } from "@/lib/data/mock/store";

const cookie = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "ri_session" && cookie.value ? { name, value: cookie.value } : undefined) }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { connectGoogleAction, disconnectAction, syncNowAction } from "./sources";

const SHOP = "spice-indiranagar";
const googleId = () => listSourcesAt(SHOP, Date.now())[0].id;

beforeEach(() => {
  resetStore();
  cookie.value = undefined;
});

describe("source actions", () => {
  it("won't sync another owner's source", async () => {
    cookie.value = "u-other";
    const before = listSourcesAt(SHOP, Date.now())[0];
    expect(await syncNowAction(SHOP, before.id)).toEqual({ ok: false, message: "Shop not found" });
    expect(listSourcesAt(SHOP, Date.now())[0]).toEqual(before);
  });

  it("won't disconnect when logged out", async () => {
    expect((await disconnectAction(SHOP, googleId())).ok).toBe(false);
    expect(listSourcesAt(SHOP, Date.now())[0].status).toBe("connected");
  });

  it("lets the owner sync now", async () => {
    cookie.value = "u-demo-owner";
    expect(await syncNowAction(SHOP, googleId())).toEqual({ ok: true });
    expect(listSourcesAt(SHOP, Date.now())[0].status).toBe("syncing");
  });

  it("connects and goes back to the sources page", async () => {
    cookie.value = "u-demo-owner";
    await expect(connectGoogleAction("spice-koramangala", "loc-1")).rejects.toThrow("REDIRECT:/shops/spice-koramangala/sources");
  });

  it("rejects a location that isn't on the list", async () => {
    cookie.value = "u-demo-owner";
    expect(await connectGoogleAction("spice-koramangala", "loc-9")).toEqual({ ok: false, message: "Pick one of your locations." });
  });
});
