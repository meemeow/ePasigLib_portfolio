/** A callable's payload, defaulted so callers can read fields off it safely. */
export function unwrap<T>(data: unknown): T {
  return (data || {}) as T;
}

/** The error's own message, or `fallback` when it carries none. */
export function messageFor(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * `messageFor`, with the transport's error-code prefix trimmed off so the text
 * reads as a sentence when it reaches the screen.
 */
export function friendlyMessageFor(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message.replace(/^(FirebaseError|internal):\s*/i, "");
  }
  return fallback;
}
