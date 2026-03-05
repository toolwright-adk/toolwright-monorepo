import { describe, it, expect } from "vitest";
import {
  mockToolCall,
  assertToolSuccess,
  assertToolError,
  createTestContext,
} from "../testing.js";
import { success, error } from "../output.js";
import { ToolInputError } from "../errors.js";

describe("testing", () => {
  describe("mockToolCall", () => {
    it("passes options.arguments to handler and returns result", async () => {
      const handler = (args: Record<string, unknown>) =>
        Promise.resolve(args.value);
      const options = { name: "test", arguments: { value: "result" } };
      const result = await mockToolCall(handler, options);
      expect(result).toBe("result");
    });

    it("works with async handler", async () => {
      const handler = async (args: Record<string, unknown>) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return args.value;
      };
      const options = { name: "test", arguments: { value: "async-result" } };
      const result = await mockToolCall(handler, options);
      expect(result).toBe("async-result");
    });

    it("handler that throws — promise rejects", async () => {
      const handler = async () => {
        throw new Error("Handler error");
      };
      const options = { name: "test", arguments: {} };
      await expect(mockToolCall(handler, options)).rejects.toThrow(
        "Handler error",
      );
    });
  });

  describe("assertToolSuccess", () => {
    it("passes for valid ToolSuccess shape", () => {
      const response = success("test content");
      expect(() => assertToolSuccess(response)).not.toThrow();
    });

    it("throws for response with isError: true", () => {
      const response = error(new ToolInputError("test error"));
      expect(() => assertToolSuccess(response)).toThrow();
    });

    it("throws for response with empty content array", () => {
      const response = { content: [], isError: undefined };
      expect(() => assertToolSuccess(response)).toThrow();
    });

    it("throws for response missing content", () => {
      const response = { isError: undefined };
      expect(() => assertToolSuccess(response)).toThrow();
    });
  });

  describe("assertToolError", () => {
    it("passes for valid ToolError shape", () => {
      const response = error(new ToolInputError("test error"));
      expect(() => assertToolError(response)).not.toThrow();
    });

    it("throws for response missing isError", () => {
      const response = { content: [{ type: "text", text: "error" }] };
      expect(() => assertToolError(response)).toThrow();
    });

    it("throws for response with empty content array", () => {
      const response = { isError: true, content: [] };
      expect(() => assertToolError(response)).toThrow();
    });
  });

  describe("createTestContext", () => {
    it("sets environment variables", () => {
      const ctx = createTestContext({ TEST_VAR: "test-value" });
      expect(process.env.TEST_VAR).toBe("test-value");
      ctx.teardown();
    });

    it("teardown restores original env vars", () => {
      process.env.ORIGINAL_VAR = "original-value";
      const ctx = createTestContext({ ORIGINAL_VAR: "temporary-value" });
      expect(process.env.ORIGINAL_VAR).toBe("temporary-value");
      ctx.teardown();
      expect(process.env.ORIGINAL_VAR).toBe("original-value");
    });

    it("teardown deletes env vars that didn't exist before", () => {
      delete process.env.NEW_VAR;
      const ctx = createTestContext({ NEW_VAR: "new-value" });
      expect(process.env.NEW_VAR).toBe("new-value");
      ctx.teardown();
      expect(process.env.NEW_VAR).toBeUndefined();
    });

    it("addCleanup hooks run in reverse order on teardown", async () => {
      const executionOrder: number[] = [];
      const ctx = createTestContext();
      ctx.addCleanup(async () => {
        executionOrder.push(1);
      });
      ctx.addCleanup(async () => {
        executionOrder.push(2);
      });
      await ctx.teardown();
      expect(executionOrder).toEqual([2, 1]);
    });

    it("works with no env vars (empty default)", () => {
      const ctx = createTestContext();
      expect(ctx.env).toEqual({});
      ctx.teardown();
    });
  });
});
