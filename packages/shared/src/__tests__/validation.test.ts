import { describe, it, expect } from "vitest";
import {
  validateToolInput,
  type ValidationFailure,
} from "../validation.js";
import { ToolInputError } from "../errors.js";
import { z } from "zod";

describe("validation", () => {
  it("valid input returns { success: true, data }", () => {
    const schema = z.object({ name: z.string() });
    const input = { name: "John" };
    const result = validateToolInput(schema, input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "John" });
    }
  });

  it("valid input with Zod transforms/defaults applies them", () => {
    const schema = z.object({
      name: z.string().default("Anonymous"),
      age: z.number().transform(String),
    });
    const input = { age: 25 };
    const result = validateToolInput(schema, input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Anonymous", age: "25" });
    }
  });

  it("invalid input returns { success: false, error }", () => {
    const schema = z.object({ name: z.string() });
    const input = { name: 123 };
    const result = validateToolInput(schema, input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ToolInputError);
    }
  });

  it("error is a ToolInputError instance", () => {
    const schema = z.object({ name: z.string() });
    const input = { name: 123 };
    const result = validateToolInput(schema, input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ToolInputError);
    }
  });

  it("error details contain fieldErrors with correct paths", () => {
    const schema = z.object({ name: z.string() });
    const input = { name: 123 };
    const result = validateToolInput(schema, input);
    expect(result.success).toBe(false);
    if (!result.success) {
      const failure = result as ValidationFailure;
      expect(failure.error.details.fieldErrors).toHaveProperty("name");
    }
  });

  it("multiple field errors on same field are grouped", () => {
    const schema = z.object({
      name: z.string().min(3, "Too short").max(2, "Too long"),
    });
    const input = { name: "A" };
    const result = validateToolInput(schema, input);
    expect(result.success).toBe(false);
    if (!result.success) {
      const failure = result as ValidationFailure;
      const errors = failure.error.details.fieldErrors.name;
      expect(errors).toContain("Too short");
    }
  });

  it('nested object path uses dot notation (e.g., "address.city")', () => {
    const schema = z.object({
      address: z.object({
        city: z.string(),
      }),
    });
    const input = { address: { city: 123 } };
    const result = validateToolInput(schema, input);
    expect(result.success).toBe(false);
    if (!result.success) {
      const failure = result as ValidationFailure;
      expect(failure.error.details.fieldErrors).toHaveProperty("address.city");
    }
  });

  it('root-level error uses "_root" as path key', () => {
    const schema = z.string();
    const input = 123;
    const result = validateToolInput(schema, input);
    expect(result.success).toBe(false);
    if (!result.success) {
      const failure = result as ValidationFailure;
      expect(failure.error.details.fieldErrors).toHaveProperty("_root");
    }
  });

  it("completely wrong type (e.g., string where object expected)", () => {
    const schema = z.object({ name: z.string() });
    const input = "not an object";
    const result = validateToolInput(schema, input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ToolInputError);
    }
  });
});
