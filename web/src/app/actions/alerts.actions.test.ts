import { beforeEach, describe, expect, it, vi } from "vitest";
import { listAlertRules } from "@/lib/data/mock/alerts";
import { resetStore } from "@/lib/data/mock/store";

const cookie = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "ri_session" && cookie.value ? { name, value: cookie.value } : undefined) }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { saveRule, toggleRule } from "./alerts";

beforeEach(() => {
  resetStore();
  cookie.value = "u-demo-owner";
});

describe("alert actions", () => {
  it("adds a new rule sent with an empty id", async () => {
    const before = listAlertRules("spice-koramangala").length;
    const result = await saveRule("spice-koramangala", { id: "", shopId: "spice-koramangala", enabled: true, kind: "new_aspect", params: {} });
    expect(result).toEqual({ ok: true });
    expect(listAlertRules("spice-koramangala")).toHaveLength(before + 1);
  });

  it("won't let another user change a rule", async () => {
    cookie.value = "u-other";
    expect(await toggleRule("spice-indiranagar", "r-1", false)).toEqual({ ok: false, message: "Shop not found" });
    expect(listAlertRules("spice-indiranagar").find((r) => r.id === "r-1")?.enabled).toBe(true);
  });

  it("won't edit a rule id that belongs to another shop", async () => {
    const result = await saveRule("spice-koramangala", { id: "r-1", shopId: "spice-koramangala", enabled: false, kind: "new_aspect", params: {} });
    expect(result.ok).toBe(false);
  });
});
