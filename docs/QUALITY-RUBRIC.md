# Quality Rubric

Standards for Toolwright MCP servers. Every server in this monorepo must meet these criteria before shipping.

## Security

- **Input validation**: All tool inputs validated with Zod schemas via `validateToolInput()`. Never trust raw input.
- **No secret logging**: API keys, tokens, and credentials must never appear in logs or error messages. Use `[REDACTED]` placeholders. (`.env` files with real keys for local development are expected and not a concern.)
- **Principle of least privilege**: Request only the API scopes and permissions each tool actually needs. Document required permissions in the tool's README.

## Reliability

- **Error handling**: Every external call wrapped in try/catch. Use the error taxonomy from `@toolwright-adk/shared` — `ExternalServiceError` for API failures, `ToolInputError` for bad input, etc.
- **Partial failure recovery**: Batch operations must track completed vs failed items. Use `PartialExecutionError` to report what succeeded and what didn't, so the agent can decide how to proceed.
- **Idempotency**: Tools that create or modify resources should be safe to retry. Use external IDs or deduplication keys where possible.

## Developer Experience

- **Clear tool descriptions**: Each tool's MCP description should explain what it does, what inputs it expects, and what it returns — in plain language an agent can parse.
- **Example inputs/outputs**: README includes at least one concrete example per tool showing input arguments and expected response shape.
- **Meaningful error messages**: Errors should tell the caller what went wrong and suggest how to fix it. `"Missing required field: teamId"` not `"Validation failed"`.

## Testing

- **Unit tests for each tool**: Every tool handler has tests covering happy path, invalid input, and error cases.
- **Integration test pattern**: A `__tests__/integration/` directory with tests that run against real APIs (gated behind `INTEGRATION=true` env var).
- **Mock external services**: Unit tests use mocked HTTP responses. Never hit real APIs in CI. Use `mockToolCall()` and `createTestContext()` from shared.
