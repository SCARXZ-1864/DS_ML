/** Reuse the caller's x-request-id, or mint one, so logs correlate across services. */
export function getRequestId(request: Request): string {
  const incoming = request.headers.get("x-request-id");
  return incoming && incoming.length <= 128 ? incoming : crypto.randomUUID();
}
