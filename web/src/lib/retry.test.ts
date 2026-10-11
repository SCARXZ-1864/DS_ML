import { describe, expect, it, vi } from "vitest";
import { RetryableError, withRetry } from "./retry";

const noSleep = () => Promise.resolve();

describe("withRetry", () => {
  it("returns the first successful result without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withRetry(fn, { sleep: noSleep })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries retryable errors and then succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new RetryableError("cold"))
      .mockRejectedValueOnce(new RetryableError("cold"))
      .mockResolvedValue("ok");
    await expect(withRetry(fn, { attempts: 4, sleep: noSleep })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry non-retryable errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("bad request"));
    await expect(withRetry(fn, { attempts: 4, sleep: noSleep })).rejects.toThrow("bad request");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("gives up after the configured number of attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new RetryableError("still cold"));
    await expect(withRetry(fn, { attempts: 3, sleep: noSleep })).rejects.toThrow("still cold");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("uses full-jitter exponential backoff capped at capMs", async () => {
    const sleeps: number[] = [];
    const fn = vi.fn().mockRejectedValue(new RetryableError("cold"));
    await expect(
      withRetry(fn, {
        attempts: 5,
        baseMs: 100,
        capMs: 300,
        random: () => 0.999999,
        sleep: async (ms) => void sleeps.push(ms),
      }),
    ).rejects.toThrow();
    // attempts 0..3 sleep: ~100, ~200, 300 (capped), 300 (capped)
    expect(sleeps.map(Math.round)).toEqual([100, 200, 300, 300]);
  });

  it("honours retryAfterMs from the error instead of the computed delay", async () => {
    const sleeps: number[] = [];
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new RetryableError("429", { retryAfterMs: 1234 }))
      .mockResolvedValue("ok");
    await withRetry(fn, { sleep: async (ms) => void sleeps.push(ms) });
    expect(sleeps).toEqual([1234]);
  });

  it("stops when the next sleep would exceed the total deadline", async () => {
    let now = 0;
    const fn = vi.fn().mockRejectedValue(new RetryableError("cold"));
    await expect(
      withRetry(fn, {
        attempts: 10,
        baseMs: 1000,
        capMs: 1000,
        deadlineMs: 2500,
        random: () => 0.999999,
        now: () => now,
        sleep: async (ms) => {
          now += ms;
        },
      }),
    ).rejects.toThrow("cold");
    // t=0 call, sleep→1000, call, sleep→2000, call, next sleep would reach 3000 > 2500 → stop
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("reports each retry through onRetry", async () => {
    const onRetry = vi.fn();
    const fn = vi.fn().mockRejectedValueOnce(new RetryableError("cold")).mockResolvedValue("ok");
    await withRetry(fn, { sleep: noSleep, onRetry });
    expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ attempt: 1 }));
  });
});
