/**
 * The Celerey API returns HTTP 200 for failures. The real code is `status`
 * on `{ success: false, status, message }`. Callers that branch on the HTTP
 * status need that code lifted onto the response.
 */
export function httpStatusFromEnvelope(
  upstreamStatus: number,
  data: unknown,
): number {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return upstreamStatus;
  }
  const body = data as { success?: unknown; status?: unknown };
  if (body.success !== false) return upstreamStatus;
  if (
    typeof body.status === "number" &&
    body.status >= 400 &&
    body.status < 600
  ) {
    return body.status;
  }
  return upstreamStatus === 200 ? 400 : upstreamStatus;
}
