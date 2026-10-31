import type { NextRequest } from "next/server";
import { accessError, apiError, firstIssue } from "@/lib/api";
import { data } from "@/lib/data";
import { viewerGuard } from "@/lib/data/load";
import { ReviewQuerySchema } from "@/lib/data/schemas";
import { createLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/request";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/shops/[shopId]/reviews">) {
  const requestId = getRequestId(request);
  const { shopId } = await ctx.params;
  const guard = await viewerGuard(shopId);
  if ("error" in guard) return accessError(guard.error, requestId);
  // Empty values mean "no filter", so drop them before validating.
  const raw = Object.fromEntries([...request.nextUrl.searchParams].filter(([, v]) => v !== ""));
  const parsed = ReviewQuerySchema.safeParse(raw);
  if (!parsed.success) return apiError("VALIDATION_ERROR", 400, firstIssue(parsed.error), requestId);

  const page = await data.getReviews(shopId, parsed.data);
  if (!page) return apiError("NOT_FOUND", 404, "Shop not found", requestId);

  createLogger({ requestId }).info("reviews_listed", { shop_id: shopId, total: page.total });
  return Response.json(page, { headers: { "x-request-id": requestId, "cache-control": "no-store" } });
}
