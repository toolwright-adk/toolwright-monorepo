import pino from "pino";

export type Logger = pino.Logger;

export interface LoggerOptions {
  level?: "debug" | "info" | "warn" | "error";
  destination?: pino.DestinationStream;
}

/**
 * Create a structured JSON logger for an MCP server.
 * Outputs newline-delimited JSON with fields: timestamp, server, level, msg.
 * Use child() to bind additional context (tool name, request ID).
 */
export function createLogger(
  serverName: string,
  options: LoggerOptions = {},
): Logger {
  const opts: pino.LoggerOptions = {
    name: serverName,
    level: options.level ?? "info",
    timestamp: pino.stdTimeFunctions.isoTime,
    messageKey: "msg",
    base: {
      server: serverName,
    },
  };

  if (options.destination) {
    return pino(opts, options.destination);
  }
  return pino(opts);
}
