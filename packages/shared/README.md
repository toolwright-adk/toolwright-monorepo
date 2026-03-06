# @toolwright-adk/shared

Shared utilities for building Toolwright MCP servers — validation, structured errors, logging with secret redaction, output formatting, async context propagation, timing, and test helpers.

[![npm](https://img.shields.io/npm/v/@toolwright-adk/shared)](https://www.npmjs.com/package/@toolwright-adk/shared)

## Install

```bash
pnpm add @toolwright-adk/shared
```

## API

### Errors

Typed error hierarchy that converts to MCP error format via `.toMCPError()`.

```typescript
import {
  ToolInputError,
  ExternalServiceError,
  PlanValidationError,
  PartialExecutionError,
} from "@toolwright-adk/shared";

throw new ToolInputError("name is required", { field: "name" });
throw new ExternalServiceError("rate limited", "linear", { retryAfter: 30 });
throw new PlanValidationError("duplicate epic names");
throw new PartialExecutionError(
  "2 of 5 epics failed",
  ["epic-1"],
  ["epic-3", "epic-5"],
);
```

All extend the abstract `ToolwrightError` base class with a `code` property and `toMCPError()` method.

### Validation

Zod-based input validation that returns typed results or `ToolInputError`.

```typescript
import { validateToolInput } from "@toolwright-adk/shared";
import { z } from "zod";

const schema = z.object({ name: z.string(), count: z.number().positive() });
const result = validateToolInput(schema, input);

if (!result.success) {
  // result.error is a ToolInputError with field-level messages
  return error(result.error);
}
// result.data is typed as { name: string; count: number }
```

### Output Formatting

Format responses as MCP success/error payloads.

```typescript
import { success, error } from "@toolwright-adk/shared";

return success({ id: "proj-1", name: "My Project" });
// { content: [{ type: "text", text: "..." }], _meta: { data: { id, name } } }

return error(new ToolInputError("bad input"));
// { isError: true, content: [{ type: "text", text: "..." }], _meta: { error: { code, message } } }
```

### Logging

Structured JSON logger with automatic redaction of sensitive fields (`apiKey`, `token`, `authorization`, `password`, `secret`).

```typescript
import { createLogger } from "@toolwright-adk/shared";

const logger = createLogger("my-server");
logger.info({ tool: "generate-plan" }, "starting generation");

// Bind context for a specific tool
const toolLogger = logger.child({ tool: "bootstrap-project", requestId });
```

### Context

Async-safe request context propagation using `AsyncLocalStorage`.

```typescript
import {
  runWithContext,
  getContext,
  generateRequestId,
} from "@toolwright-adk/shared";

const ctx = {
  requestId: generateRequestId(),
  serverName: "my-server",
  toolName: "generate-plan",
  startedAt: Date.now(),
};

await runWithContext(ctx, async () => {
  // anywhere in this call stack:
  const current = getContext(); // returns ctx
});
```

### Timing

Measure and log execution duration.

```typescript
import { withTiming, createTimer } from "@toolwright-adk/shared";

// Automatic logging with context enrichment
const { result, durationMs } = await withTiming("llm-call", () =>
  callLLM(prompt),
);

// Manual stopwatch
const timer = createTimer();
doWork();
console.log(`took ${timer.elapsed()}ms`);
```

### Testing

Available as a separate import to keep test deps out of production bundles.

```typescript
import {
  mockToolCall,
  assertToolSuccess,
  assertToolError,
  createTestContext,
} from "@toolwright-adk/shared/testing";

// Mock a tool invocation
const response = await mockToolCall(handler, {
  name: "generate-plan",
  arguments: { goal: "..." },
});
assertToolSuccess(response);

// Isolated test environment
const ctx = createTestContext({ LINEAR_API_KEY: "test-key" });
// ... run tests ...
await ctx.teardown(); // restores original env
```

## License

[MIT](../../LICENSE)
