import { describe, it, expect } from "vitest";
import { withTiming, createTimer } from "../timing.js";
import { runWithContext, type RequestContext } from "../context.js";

describe("timing", () => {
  describe("createTimer", () => {
    it("returns a non-negative integer", () => {
      const timer = createTimer();
      const ms = timer.elapsed();
      expect(ms).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(ms)).toBe(true);
    });

    it("elapsed increases over time", async () => {
      const timer = createTimer();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(timer.elapsed()).toBeGreaterThan(0);
    });
  });

  describe("withTiming", () => {
    it("returns result and durationMs for sync fn", async () => {
      const { result, durationMs } = await withTiming("sync", () => 42);
      expect(result).toBe(42);
      expect(durationMs).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(durationMs)).toBe(true);
    });

    it("returns result and durationMs for async fn", async () => {
      const { result, durationMs } = await withTiming("async", async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return "done";
      });
      expect(result).toBe("done");
      expect(durationMs).toBeGreaterThanOrEqual(40);
    });

    it("re-throws errors", async () => {
      await expect(
        withTiming("fail", () => {
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");
    });

    it("works within a request context", async () => {
      const ctx: RequestContext = {
        requestId: "t-req",
        serverName: "t-server",
        toolName: "t-tool",
        startedAt: Date.now(),
      };

      const { result } = await runWithContext(ctx, () =>
        withTiming("ctx-test", () => "ok"),
      );
      expect(result).toBe("ok");
    });

    it("works outside a request context", async () => {
      const { result } = await withTiming("no-ctx", () => "fallback");
      expect(result).toBe("fallback");
    });
  });
});
