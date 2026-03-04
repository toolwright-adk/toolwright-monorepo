import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export interface RequestContext {
  requestId: string;
  serverName: string;
  toolName: string;
  startedAt: number;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Execute a function within a request context.
 * The context is accessible via getContext() from anywhere in the call stack.
 */
export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

/**
 * Retrieve the current request context from the async call stack.
 * Returns undefined if called outside of runWithContext().
 */
export function getContext(): RequestContext | undefined {
  return storage.getStore();
}

/**
 * Generate a unique request ID.
 */
export function generateRequestId(): string {
  return randomUUID();
}
