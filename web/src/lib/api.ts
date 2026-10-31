import type { z } from "zod";

// The shared error shape for every API route (docs/ENGINEERING.md §3).
export type ErrorCode = "VALIDATION_ERROR" | "UNAUTHORIZED" | "NOT_FOUND" | "INTERNAL_ERROR";

export function apiError(code: ErrorCode, status: number, message: string, requestId: string): Response {
  return Response.json(
    { error: { code, message, request_id: requestId } },
    { status, headers: { "x-request-id": requestId, "cache-control": "no-store" } },
  );
}

/** The first validation problem as one readable sentence, e.g. "limit: Too big: expected number to be <=50". */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input";
  return `${issue.path.join(".") || "input"}: ${issue.message}`;
}

/** The error response for a failed access check (lib/data/load.ts guards). */
export function accessError(error: "UNAUTHORIZED" | "NOT_FOUND", requestId: string): Response {
  return error === "UNAUTHORIZED"
    ? apiError("UNAUTHORIZED", 401, "Log in to see this shop", requestId)
    : apiError("NOT_FOUND", 404, "Shop not found", requestId);
}
