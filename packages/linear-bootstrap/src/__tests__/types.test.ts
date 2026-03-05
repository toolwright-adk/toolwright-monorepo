import { describe, it, expect } from "vitest";
import {
  PlanSchema,
  ValidatePlanInputSchema,
  BootstrapProjectInputSchema,
  GeneratePlanInputSchema,
  IntrospectWorkspaceInputSchema,
  WorkspaceContextSchema,
} from "../types.js";

const validPlan = {
  project: { name: "Test", description: "Test project" },
  milestones: [{ name: "M1", description: "First", sort_order: 0 }],
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
          issues: [{ title: "Bad", labels: [], priority: 0, depends_on: [] }],
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
          issues: [{ title: "Bad", labels: [], priority: 5, depends_on: [] }],
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
          issues: [{ title: "T1", labels: [], priority: 3, depends_on: [] }],
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

describe("GeneratePlanInputSchema", () => {
  it("defaults project_type to feature", () => {
    const result = GeneratePlanInputSchema.safeParse({
      description: "Test",
      team_id: "team-1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.project_type).toBe("feature");
    }
  });

  it("accepts all four project types", () => {
    for (const pt of ["feature", "infrastructure", "api", "migration"]) {
      const result = GeneratePlanInputSchema.safeParse({
        description: "Test",
        team_id: "team-1",
        project_type: pt,
      });
      expect(result.success, `${pt}`).toBe(true);
    }
  });

  it("rejects invalid project_type", () => {
    const result = GeneratePlanInputSchema.safeParse({
      description: "Test",
      team_id: "team-1",
      project_type: "unknown",
    });
    expect(result.success).toBe(false);
  });
});

describe("IntrospectWorkspaceInputSchema", () => {
  it("accepts valid team_id", () => {
    const result = IntrospectWorkspaceInputSchema.safeParse({
      team_id: "team-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing team_id", () => {
    const result = IntrospectWorkspaceInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("WorkspaceContextSchema", () => {
  it("accepts a valid workspace context", () => {
    const result = WorkspaceContextSchema.safeParse({
      team_name: "Engineering",
      workflow_states: [{ id: "s1", name: "Backlog", type: "backlog" }],
      default_state_id: "s1",
      default_state_name: "Backlog",
      labels: [{ id: "l1", name: "backend" }],
      custom_fields: [],
      cycles_enabled: false,
      existing_projects: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts context with optional fields omitted", () => {
    const result = WorkspaceContextSchema.safeParse({
      team_name: "Design",
      workflow_states: [],
      labels: [],
      custom_fields: [],
      cycles_enabled: true,
      existing_projects: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.default_state_id).toBeUndefined();
      expect(result.data.active_cycle).toBeUndefined();
    }
  });

  it("rejects missing required fields", () => {
    const result = WorkspaceContextSchema.safeParse({
      team_name: "Engineering",
    });
    expect(result.success).toBe(false);
  });
});

describe("ValidatePlanInputSchema refinement", () => {
  it("rejects when neither plan nor plan_id is provided", () => {
    const result = ValidatePlanInputSchema.safeParse({
      preferences: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Either plan or plan_id is required",
      );
    }
  });

  it("accepts when plan is provided", () => {
    const result = ValidatePlanInputSchema.safeParse({
      plan: validPlan,
    });
    expect(result.success).toBe(true);
  });

  it("accepts when plan_id is provided", () => {
    const result = ValidatePlanInputSchema.safeParse({
      plan_id: "some-id",
    });
    expect(result.success).toBe(true);
  });
});

describe("BootstrapProjectInputSchema refinement", () => {
  it("rejects when neither plan nor plan_id is provided", () => {
    const result = BootstrapProjectInputSchema.safeParse({
      team_id: "team-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Either plan or plan_id is required",
      );
    }
  });

  it("accepts when plan is provided", () => {
    const result = BootstrapProjectInputSchema.safeParse({
      plan: validPlan,
      team_id: "team-1",
    });
    expect(result.success).toBe(true);
  });

  it("accepts when plan_id is provided", () => {
    const result = BootstrapProjectInputSchema.safeParse({
      plan_id: "some-id",
      team_id: "team-1",
    });
    expect(result.success).toBe(true);
  });
});
