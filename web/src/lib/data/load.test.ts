import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import { requireShop } from "./load";

describe("requireShop", () => {
  it("returns a known shop", async () => {
    expect((await requireShop("freshcart")).name).toBe("FreshCart Grocery");
  });

  it("shows the not-found page for an unknown shop id", async () => {
    await expect(requireShop("no-such-shop")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
