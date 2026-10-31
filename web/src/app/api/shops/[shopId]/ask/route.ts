import type { NextRequest } from "next/server";
import { apiError, firstIssue } from "@/lib/api";
import { data } from "@/lib/data";
import { AskRequestSchema } from "@/lib/data/schemas";
import { createLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/request";

// Streams the answer as NDJSON: one JSON chat chunk per line, sent as soon as it exists.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/shops/[shopId]/ask">) {
  const requestId = getRequestId(request);
  const { shopId } = await ctx.params;
  const parsed = AskRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", 400, firstIssue(parsed.error), requestId);

  const chunks = await data.ask(shopId, parsed.data.question);
  if (!chunks) return apiError("NOT_FOUND", 404, "Shop not found", requestId);

  const encoder = new TextEncoder();
  const line = (value: unknown) => encoder.encode(`${JSON.stringify(value)}\n`);
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of chunks) controller.enqueue(line(chunk));
      } catch (err) {
        createLogger({ requestId }).error("ask_stream_failed", { shop_id: shopId, error: String(err) });
        controller.enqueue(line({ type: "error", message: "The answer was interrupted. Please try again." }));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "x-request-id": requestId, "cache-control": "no-store" },
  });
}
