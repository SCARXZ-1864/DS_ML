import { describe, expect, it } from "vitest";
import { z } from "zod";
import { apiError, firstIssue } from "./api";

describe("API errors", () => {
  it("uses the shared error contract and echoes the request id", async () => {
    const res = apiError("NOT_FOUND", 404, "Shop not found", "req-1");
    expect(res.status).toBe(404);
    expect(res.headers.get("x-request-id")).toBe("req-1");
    expect(await res.json()).toEqual({ error: { code: "NOT_FOUND", message: "Shop not found", request_id: "req-1" } });
  });

  it("turns a zod error into one readable sentence", () => {
    const result = z.object({ limit: z.number().max(50) }).safeParse({ limit: 99 });
    expect(firstIssue(result.error!)).toMatch(/^limit: /);
  });
});
