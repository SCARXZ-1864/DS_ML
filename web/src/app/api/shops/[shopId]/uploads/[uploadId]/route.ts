import type { NextRequest } from "next/server";
import { apiError } from "@/lib/api";
import { data } from "@/lib/data";
import { ownerGuard } from "@/lib/data/load";
import { getRequestId } from "@/lib/request";

/** An upload's progress, polled by the wizard while it processes. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/shops/[shopId]/uploads/[uploadId]">) {
  const requestId = getRequestId(request);
  const { shopId, uploadId } = await ctx.params;
  const guard = await ownerGuard(shopId);
  if ("error" in guard) {
    return guard.error === "UNAUTHORIZED"
      ? apiError("UNAUTHORIZED", 401, "Log in to see this upload", requestId)
      : apiError("NOT_FOUND", 404, "Upload not found", requestId);
  }

  const upload = await data.getUpload(shopId, uploadId);
  if (!upload) return apiError("NOT_FOUND", 404, "Upload not found", requestId);
  return Response.json(upload, { headers: { "x-request-id": requestId, "cache-control": "no-store" } });
}
