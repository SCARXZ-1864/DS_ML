import type { NextRequest } from "next/server";
import { accessError, apiError, firstIssue } from "@/lib/api";
import { data } from "@/lib/data";
import { viewerGuard } from "@/lib/data/load";
import { PredictRequestSchema } from "@/lib/data/schemas";
import { getRequestId } from "@/lib/request";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/shops/[shopId]/predict">) {
  const requestId = getRequestId(request);
  const { shopId } = await ctx.params;
  const guard = await viewerGuard(shopId);
  if ("error" in guard) return accessError(guard.error, requestId);
  const parsed = PredictRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", 400, firstIssue(parsed.error), requestId);

  const prediction = await data.predict(shopId, parsed.data.text);
  if (!prediction) return apiError("NOT_FOUND", 404, "Shop not found", requestId);
  return Response.json(prediction, { headers: { "x-request-id": requestId, "cache-control": "no-store" } });
}
