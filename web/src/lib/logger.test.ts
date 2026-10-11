import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "./logger";

function captureOne(fn: () => void): Record<string, unknown> {
  const spy = vi.spyOn(console, "log").mockImplementation(() => {});
  fn();
  const line = spy.mock.calls[0][0] as string;
  return JSON.parse(line);
}

afterEach(() => vi.restoreAllMocks());

describe("logger", () => {
  it("writes one JSON line with the contract fields", () => {
    const rec = captureOne(() => createLogger({ requestId: "r1" }).info("request_completed", { status: 200 }));
    expect(rec).toMatchObject({
      level: "info",
      service: "web",
      event: "request_completed",
      request_id: "r1",
      status: 200,
    });
    expect(typeof rec.ts).toBe("string");
  });

  it("redacts secret-looking fields", () => {
    const rec = captureOne(() =>
      createLogger().warn("calling_upstream", { apiKey: "abc", authorization: "Bearer x", count: 2 }),
    );
    expect(rec.apiKey).toBe("[REDACTED]");
    expect(rec.authorization).toBe("[REDACTED]");
    expect(rec.count).toBe(2);
  });

  it("serialises errors with type and stack", () => {
    const rec = captureOne(() => createLogger().error("boom", { err: new TypeError("bad") }));
    expect(rec.level).toBe("error");
    expect(rec.err).toMatchObject({ type: "TypeError", message: "bad" });
  });
});
