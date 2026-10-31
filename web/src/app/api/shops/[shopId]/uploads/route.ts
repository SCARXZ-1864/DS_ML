import type { NextRequest } from "next/server";
import { apiError, firstIssue } from "@/lib/api";
import { data } from "@/lib/data";
import { ownerGuard } from "@/lib/data/load";
import { UploadRequestSchema } from "@/lib/data/schemas";
import { getRequestId } from "@/lib/request";

// A route handler rather than a Server Action: 5,000 rows can exceed the 1 MB Server Action
// body limit, and progress is polled from the GET route, as real background jobs will be.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/shops/[shopId]/uploads">) {
  const requestId = getRequestId(request);
  const { shopId } = await ctx.params;
  const guard = await ownerGuard(shopId);
  if ("error" in guard) {
    return guard.error === "UNAUTHORIZED"
      ? apiError("UNAUTHORIZED", 401, "Log in to upload reviews", requestId)
      : apiError("NOT_FOUND", 404, "Shop not found", requestId);
  }

  const parsed = UploadRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", 400, firstIssue(parsed.error), requestId);

  const upload = await data.startUpload(shopId, parsed.data);
  return Response.json(upload, { status: 201, headers: { "x-request-id": requestId, "cache-control": "no-store" } });
}
