import { expect } from "vitest";
import type { ToolSuccess, ToolError } from "./output.js";

export interface MockToolCallOptions {
  name: string;
  arguments: Record<string, unknown>;
}

export interface TestContext {
  env: Record<string, string>;
  cleanup: Array<() => void | Promise<void>>;
  addCleanup(fn: () => void | Promise<void>): void;
  teardown(): Promise<void>;
}

/**
 * Simulates an MCP tool invocation by calling the handler directly.
 */
export async function mockToolCall<T>(
  handler: (args: Record<string, unknown>) => Promise<T>,
  options: MockToolCallOptions,
): Promise<T> {
  return handler(options.arguments);
}

/**
 * Asserts that a response matches the expected MCP success shape.
 */
export function assertToolSuccess(
  response: unknown,
): asserts response is ToolSuccess {
  const res = response as Record<string, unknown>;
  expect(res).toHaveProperty("content");
  expect(res.isError).toBeUndefined();
  expect(Array.isArray(res.content)).toBe(true);

  const content = res.content as Array<Record<string, unknown>>;
  expect(content.length).toBeGreaterThan(0);
  expect(content[0]).toHaveProperty("type", "text");
  expect(content[0]).toHaveProperty("text");
}

/**
 * Asserts that a response matches the expected MCP error shape.
 */
export function assertToolError(
  response: unknown,
): asserts response is ToolError {
  const res = response as Record<string, unknown>;
  expect(res).toHaveProperty("isError", true);
  expect(res).toHaveProperty("content");

  const content = res.content as Array<Record<string, unknown>>;
  expect(content.length).toBeGreaterThan(0);
  expect(content[0]).toHaveProperty("type", "text");
}

/**
 * Creates a test context with environment variables and cleanup hooks.
 */
export function createTestContext(
  env: Record<string, string> = {},
): TestContext {
  const originalEnv: Record<string, string | undefined> = {};

  // Set env vars and save originals
  for (const [key, value] of Object.entries(env)) {
    originalEnv[key] = process.env[key];
    process.env[key] = value;
  }

  const ctx: TestContext = {
    env,
    cleanup: [],
    addCleanup(fn) {
      ctx.cleanup.push(fn);
    },
    async teardown() {
      // Restore env
      for (const [key] of Object.entries(env)) {
        if (originalEnv[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = originalEnv[key];
        }
      }
      // Run cleanup hooks in reverse
      for (const fn of ctx.cleanup.reverse()) {
        await fn();
      }
    },
  };

  return ctx;
}
