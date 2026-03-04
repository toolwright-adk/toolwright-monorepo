import { getContext } from "./context.js";
import { createLogger, type Logger } from "./logger.js";

export interface TimingResult<T> {
  result: T;
  durationMs: number;
}

export interface Timer {
  elapsed(): number;
}

/**
 * Create a simple stopwatch timer.
 * Call elapsed() to get milliseconds since creation.
 */
export function createTimer(): Timer {
  const start = performance.now();
  return {
    elapsed(): number {
      return Math.round(performance.now() - start);
    },
  };
}

let defaultLogger: Logger | undefined;

function getLogger(): Logger {
  if (!defaultLogger) {
    defaultLogger = createLogger("timing");
  }
  return defaultLogger;
}

/**
 * Execute a function, measure its duration, and log the result.
 * Pulls context from runWithContext() if available to enrich log output.
 */
export async function withTiming<T>(
  label: string,
  fn: () => T | Promise<T>,
): Promise<TimingResult<T>> {
  const ctx = getContext();
  let logger = getLogger();

  if (ctx) {
    logger = logger.child({
      tool: ctx.toolName,
      requestId: ctx.requestId,
    });
  }

  const timer = createTimer();

  try {
    const result = await fn();
    const durationMs = timer.elapsed();
    logger.info({ label, durationMs }, `${label} completed in ${durationMs}ms`);
    return { result, durationMs };
  } catch (err) {
    const durationMs = timer.elapsed();
    logger.error(
      { label, durationMs, err },
      `${label} failed after ${durationMs}ms`,
    );
    throw err;
  }
}
