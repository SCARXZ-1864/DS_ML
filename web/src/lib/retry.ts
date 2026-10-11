/**
 * Retry with exponential backoff + full jitter (docs/ENGINEERING.md §4).
 *
 * Only errors that are explicitly retryable get retried. Retrying a 400 or 401
 * just repeats the same failure faster, so non-retryable errors throw immediately.
 */

export class RetryableError extends Error {
  readonly retryAfterMs?: number;

  constructor(message: string, opts: { retryAfterMs?: number; cause?: unknown } = {}) {
    super(message, { cause: opts.cause });
    this.name = "RetryableError";
    this.retryAfterMs = opts.retryAfterMs;
  }
}

export interface RetryInfo {
  attempt: number; // failed attempts so far (1-based)
  delayMs: number;
  error: unknown;
}

export interface RetryOptions {
  attempts?: number;
  baseMs?: number;
  capMs?: number;
  /** Total time budget across all attempts. Keep it below the function timeout. */
  deadlineMs?: number;
  isRetryable?: (err: unknown) => boolean;
  onRetry?: (info: RetryInfo) => void;
  // Injectable for deterministic tests.
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  now?: () => number;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const {
    attempts = 4,
    baseMs = 1000,
    capMs = 8000,
    deadlineMs = Number.POSITIVE_INFINITY,
    isRetryable = (err) => err instanceof RetryableError,
    onRetry,
    sleep = defaultSleep,
    random = Math.random,
    now = Date.now,
  } = opts;

  const start = now();
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const lastAttempt = attempt + 1 >= attempts;
      if (lastAttempt || !isRetryable(err)) throw err;

      // Full jitter: a random delay in [0, min(cap, base·2^n)] so clients that
      // failed together don't all retry at the same instant.
      const retryAfter = err instanceof RetryableError ? err.retryAfterMs : undefined;
      const delayMs = retryAfter ?? random() * Math.min(capMs, baseMs * 2 ** attempt);

      if (now() - start + delayMs > deadlineMs) throw err;

      onRetry?.({ attempt: attempt + 1, delayMs, error: err });
      await sleep(delayMs);
    }
  }
}
