import { createLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/request";

// Health contract: docs/ENGINEERING.md §5. Reading request headers keeps this
// route dynamic under Cache Components; a prerendered health check would be useless.

type CheckState = "ok" | "waking" | "down" | "not_configured";

const STARTED_AT = Date.now();
const CHECK_TIMEOUT_MS = 3000;

async function checkInference(requestId: string): Promise<CheckState> {
  const base = process.env.INFERENCE_URL;
  if (!base) return "not_configured";
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/health`, {
      headers: { "x-request-id": requestId },
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      cache: "no-store",
    });
    if (res.ok) return "ok";
    // A cold or restarting inference host may answer 502/503/504 while it boots.
    return [502, 503, 504].includes(res.status) ? "waking" : "down";
  } catch (err) {
    // A timeout most likely means the inference container is cold-starting, not dead.
    return err instanceof DOMException && err.name === "TimeoutError" ? "waking" : "down";
  }
}

function overall(checks: Record<string, CheckState>): "ok" | "degraded" {
  const bad = Object.values(checks).some((s) => s === "waking" || s === "down");
  return bad ? "degraded" : "ok";
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const log = createLogger({ requestId });
  const t0 = Date.now();

  const checks = { inference: await checkInference(requestId) };
  const body = {
    status: overall(checks),
    service: "web",
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
    uptime_s: Math.round((Date.now() - STARTED_AT) / 1000),
    checks,
  };

  log.info("health_checked", { status: body.status, checks, duration_ms: Date.now() - t0 });
  return Response.json(body, { headers: { "x-request-id": requestId, "cache-control": "no-store" } });
}
