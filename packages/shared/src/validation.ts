import type { ZodSchema, ZodError } from "zod";
import { ToolInputError } from "./errors.js";

export interface ValidationResult<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  error: ToolInputError;
}

export function validateToolInput<T>(
  schema: ZodSchema<T>,
  input: unknown,
): ValidationResult<T> | ValidationFailure {
  const result = schema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const fieldErrors = formatZodErrors(result.error);
  return {
    success: false,
    error: new ToolInputError("Invalid tool input", { fieldErrors }),
  };
}

function formatZodErrors(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_root";
    if (!fieldErrors[path]) {
      fieldErrors[path] = [];
    }
    fieldErrors[path].push(issue.message);
  }

  return fieldErrors;
}
