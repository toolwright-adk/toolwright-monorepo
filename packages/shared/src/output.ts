import type { ToolwrightError, MCPError } from "./errors.js";

export interface ToolSuccess<T = unknown> {
  content: Array<{ type: "text"; text: string }>;
  _meta?: { data: T };
}

export interface ToolError {
  isError: true;
  content: Array<{ type: "text"; text: string }>;
  _meta?: { error: MCPError };
}

export function success<T>(data: T, message?: string): ToolSuccess<T> {
  return {
    content: [
      {
        type: "text",
        text: message ?? JSON.stringify(data, null, 2),
      },
    ],
    _meta: { data },
  };
}

export function error(err: ToolwrightError): ToolError {
  const mcpError = err.toMCPError();
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `[${mcpError.code}] ${mcpError.message}`,
      },
    ],
    _meta: { error: mcpError },
  };
}
