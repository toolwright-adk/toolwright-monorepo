import { describe, it, expect } from "vitest";
import {
  runWithContext,
  getContext,
  generateRequestId,
  type RequestContext,
} from "../context.js";

describe("context", () => {
  describe("generateRequestId", () => {
    it("returns a valid UUID string", () => {
      const id = generateRequestId();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it("returns unique values", () => {
      const ids = new Set(
        Array.from({ length: 100 }, () => generateRequestId()),
      );
      expect(ids.size).toBe(100);
    });
  });

  describe("getContext", () => {
    it("returns undefined outside runWithContext", () => {
      expect(getContext()).toBeUndefined();
    });
  });

  describe("runWithContext", () => {
    const ctx: RequestContext = {
      requestId: "test-id",
      serverName: "test-server",
      toolName: "test-tool",
      startedAt: Date.now(),
    };

    it("makes context available synchronously", () => {
      runWithContext(ctx, () => {
        const retrieved = getContext();
        expect(retrieved).toBeDefined();
        expect(retrieved!.requestId).toBe("test-id");
        expect(retrieved!.serverName).toBe("test-server");
        expect(retrieved!.toolName).toBe("test-tool");
      });
    });

    it("makes context available across async boundaries", async () => {
      await runWithContext(ctx, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(getContext()!.requestId).toBe("test-id");
      });
    });

    it("returns the value from fn", () => {
      const result = runWithContext(ctx, () => 42);
      expect(result).toBe(42);
    });

    it("context is unavailable after completion", () => {
      runWithContext(ctx, () => {});
      expect(getContext()).toBeUndefined();
    });

    it("supports nested contexts", () => {
      const inner: RequestContext = { ...ctx, requestId: "inner" };

      runWithContext(ctx, () => {
        expect(getContext()!.requestId).toBe("test-id");

        runWithContext(inner, () => {
          expect(getContext()!.requestId).toBe("inner");
        });

        expect(getContext()!.requestId).toBe("test-id");
      });
    });
  });
});
