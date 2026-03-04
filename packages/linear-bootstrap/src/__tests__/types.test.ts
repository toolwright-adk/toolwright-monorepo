import { describe, it, expect } from "vitest";
import {
  PlanSchema,
  BootstrapProjectInputSchema,
} from "../types.js";

const validPlan = {
  project: { name: "Test", description: "Test project" },
  milestones: [
    { name: "M1", description: "First", sort_order: 0 },
  ],
  epics: [
    {
      title: "Epic 1",
      description: "First epic",
      milestone: "M1",
      issues: [
        {
          title: "Task A",
          labels: ["backend"],
          priority: 2,
          depends_on: [],
        },
      ],
    },
  ],
};

describe("PlanSchema", () => {
  it("accepts a valid plan", () => {
    const result = PlanSchema.safeParse(validPlan);
    expect(result.success).toBe(true);
  });

  it("rejects missing project.name", () => {
    const result = PlanSchema.safeParse({
      ...validPlan,
      project: { description: "No name" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects priority out of range (0)", () => {
    const result = PlanSchema.safeParse({
      ...validPlan,
      epics: [
        {
          ...validPlan.epics[0],
          issues: [
            { title: "Bad", labels: [], priority: 0, depends_on: [] },
          ],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects priority out of range (5)", () => {
    const result = PlanSchema.safeParse({
      ...validPlan,
      epics: [
        {
          ...validPlan.epics[0],
          issues: [
            { title: "Bad", labels: [], priority: 5, depends_on: [] },
          ],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields as absent", () => {
    const result = PlanSchema.safeParse({
      project: { name: "Minimal", description: "Minimal plan" },
      milestones: [{ name: "M1", description: "Phase 1", sort_order: 0 }],
      epics: [
        {
          title: "E1",
          description: "Epic",
          milestone: "M1",
          issues: [
            { title: "T1", labels: [], priority: 3, depends_on: [] },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.project.target_date).toBeUndefined();
      expect(result.data.epics[0].issues[0].description).toBeUndefined();
      expect(result.data.epics[0].issues[0].estimate).toBeUndefined();
    }
  });
});

describe("BootstrapProjectInputSchema", () => {
  it("defaults dry_run to false", () => {
    const result = BootstrapProjectInputSchema.safeParse({
      plan: validPlan,
      team_id: "team-1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dry_run).toBe(false);
    }
  });

  it("rejects missing team_id", () => {
    const result = BootstrapProjectInputSchema.safeParse({
      plan: validPlan,
    });
    expect(result.success).toBe(false);
  });
});
