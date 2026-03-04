export interface MCPError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export abstract class ToolwrightError extends Error {
  abstract readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }

  toMCPError(): MCPError {
    return {
      code: this.code,
      message: this.message,
      ...(Object.keys(this.details).length > 0 && { details: this.details }),
    };
  }
}

export class ToolInputError extends ToolwrightError {
  readonly code = "TOOL_INPUT_ERROR";

  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message, details);
  }
}

export class ExternalServiceError extends ToolwrightError {
  readonly code = "EXTERNAL_SERVICE_ERROR";

  constructor(
    message: string,
    public readonly service: string,
    details: Record<string, unknown> = {},
  ) {
    super(message, { service, ...details });
  }
}

export class PlanValidationError extends ToolwrightError {
  readonly code = "PLAN_VALIDATION_ERROR";

  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message, details);
  }
}

export class PartialExecutionError extends ToolwrightError {
  readonly code = "PARTIAL_EXECUTION_ERROR";

  constructor(
    message: string,
    public readonly completed: string[],
    public readonly failed: string[],
    details: Record<string, unknown> = {},
  ) {
    super(message, { completed, failed, ...details });
  }
}
