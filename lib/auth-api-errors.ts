/** Hide raw hosting/proxy noise from end users. */
export function sanitizeAuthApiMessage(
  message: string | undefined | null,
  fallback: string,
): string {
  if (!message?.trim()) return fallback;

  const lower = message.toLowerCase();
  if (
    lower.includes(".shtml") ||
    lower.includes("cannot get /") ||
    lower.includes("cannot post /") ||
    lower.includes("server misconfiguration")
  ) {
    return "We could not reach the sign-in service. Please try again in a moment.";
  }

  return message;
}
