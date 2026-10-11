import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

function req(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/health", { headers });
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /api/health", () => {
  it("follows the health contract and echoes the request id", async () => {
    vi.stubEnv("INFERENCE_URL", "");
    const res = await GET(req({ "x-request-id": "abc" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("abc");
    const body = await res.json();
    expect(body).toMatchObject({ service: "web", checks: { inference: "not_configured" } });
    expect(["ok", "degraded", "down"]).toContain(body.status);
    expect(typeof body.uptime_s).toBe("number");
  });

  it("reports inference ok when the Space health check succeeds", async () => {
    vi.stubEnv("INFERENCE_URL", "https://space.example");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ status: "ok" }, { status: 200 })),
    );
    const body = await (await GET(req())).json();
    expect(body.checks.inference).toBe("ok");
    expect(body.status).toBe("ok");
  });

  it("forwards x-request-id to the Space so logs correlate across services", async () => {
    vi.stubEnv("INFERENCE_URL", "https://space.example/");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ status: "ok" }));
    vi.stubGlobal("fetch", fetchMock);
    await GET(req({ "x-request-id": "corr-1" }));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://space.example/health");
    expect(new Headers(init.headers).get("x-request-id")).toBe("corr-1");
  });

  it("reports inference waking when the Space returns 503 (cold start)", async () => {
    vi.stubEnv("INFERENCE_URL", "https://space.example");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Starting…", { status: 503 })));
    const body = await (await GET(req())).json();
    expect(body.checks.inference).toBe("waking");
    expect(body.status).toBe("degraded");
  });

  it("reports inference waking when the Space health check times out", async () => {
    vi.stubEnv("INFERENCE_URL", "https://space.example");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("The operation timed out.", "TimeoutError")),
    );
    const body = await (await GET(req())).json();
    expect(body.checks.inference).toBe("waking");
  });

  it("reports inference down on a non-cold-start failure", async () => {
    vi.stubEnv("INFERENCE_URL", "https://space.example");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    const body = await (await GET(req())).json();
    expect(body.checks.inference).toBe("down");
    expect(body.status).toBe("degraded");
  });
});
