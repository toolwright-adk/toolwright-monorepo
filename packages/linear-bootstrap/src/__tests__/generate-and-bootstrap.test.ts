import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createTestContext,
  assertToolSuccess,
} from "@toolwright-adk/shared/testing";
import { createLogger, success } from "@toolwright-adk/shared";
import { clearPlanCache } from "../plan-cache.js";
import type { Plan, PlanSummary, BootstrapResult } from "../types.js";

const mockGeneratePlanCore = vi.fn();
const mockBootstrapProject = vi.fn();

vi.mock("../tools/generate-plan.js", () => ({
  generatePlanCore: (...args: unknown[]) => mockGeneratePlanCore(...args),
}));
vi.mock("../tools/bootstrap-project.js", () => ({
  bootstrapProject: (...args: unknown[]) => mockBootstrapProject(...args),
}));

import { generateAndBootstrap } from "../tools/generate-and-bootstrap.js";

const logger = createLogger("test", { level: "error" });

const validPlan: Plan = {
  project: { name: "Test", description: "Test project" },
  milestones: [{ name: "M1", description: "First", sort_order: 0 }],
  epics: [
    {
      title: "Epic 1",
      description: "First epic",
      milestone: "M1",
      issues: [
        {
          title: "Issue A",
          labels: ["backend"],
          priority: 2,
          depends_on: [],
        },
      ],
    },
  ],
};

const validSummary: PlanSummary = {
  total_issues: 1,
  total_epics: 1,
  total_milestones: 1,
  estimated_points: 0,
};

const bootstrapResult: BootstrapResult = {
  project_id: "project-1",
  milestone_ids: { M1: "milestone-1" },
  label_ids: { backend: "label-1" },
  epic_ids: { "Epic 1": "epic-1" },
  issue_ids: { "Issue A": "issue-a" },
  dependency_count: 0,
};

describe("generateAndBootstrap", () => {
  let ctx: ReturnType<typeof createTestContext>;

  beforeEach(() => {
    ctx = createTestContext({
      LLM_API_KEY: "test-key",
      LLM_BASE_URL: "https://api.example.com/v1",
      LLM_MODEL: "test-model",
      LINEAR_API_KEY: "test-key",
    });
    clearPlanCache();
  });

  afterEach(async () => {
    await ctx.teardown();
    vi.clearAllMocks();
  });

  it("generates, validates, and bootstraps a project", async () => {
    mockGeneratePlanCore.mockResolvedValue({
      plan: validPlan,
      summary: validSummary,
    });
    mockBootstrapProject.mockResolvedValue(success(bootstrapResult));

    const result = await generateAndBootstrap(
      {
        description: "Build a test project",
        team_id: "team-1",
        complexity: "medium",
        project_type: "feature",
        dry_run: false,
      },
      logger,
    );

    assertToolSuccess(result);
    const data = result._meta?.data as Record<string, unknown>;
    expect(data.plan_id).toBeDefined();
    expect(data.summary).toEqual(validSummary);
    expect(data.validation.valid).toBe(true);
    expect(data.bootstrap).toBeDefined();
    expect(data.bootstrap.project_id).toBe("project-1");
    expect(mockBootstrapProject).toHaveBeenCalledTimes(1);
  });

  it("skips bootstrap when dry_run is true", async () => {
    mockGeneratePlanCore.mockResolvedValue({
      plan: validPlan,
      summary: validSummary,
    });

    const result = await generateAndBootstrap(
      {
        description: "Build a test project",
        team_id: "team-1",
        complexity: "medium",
        project_type: "feature",
        dry_run: true,
      },
      logger,
    );

    assertToolSuccess(result);
    const data = result._meta?.data as Record<string, unknown>;
    expect(data.plan_id).toBeDefined();
    expect(data.summary).toEqual(validSummary);
    expect(data.validation.valid).toBe(true);
    expect(data.bootstrap).toBeUndefined();
    expect(mockBootstrapProject).not.toHaveBeenCalled();
  });

  it("skips bootstrap when validation fails", async () => {
    // Plan with circular deps: A depends on B, B depends on A
    const invalidPlan: Plan = {
      ...validPlan,
      epics: [
        {
          title: "Epic 1",
          description: "desc",
          milestone: "M1",
          issues: [
            {
              title: "Issue A",
              labels: [],
              priority: 2,
              depends_on: ["Issue B"],
            },
            {
              title: "Issue B",
              labels: [],
              priority: 2,
              depends_on: ["Issue A"],
            },
          ],
        },
      ],
    };

    mockGeneratePlanCore.mockResolvedValue({
      plan: invalidPlan,
      summary: { ...validSummary, total_issues: 2 },
    });

    const result = await generateAndBootstrap(
      {
        description: "Build a test project",
        team_id: "team-1",
        complexity: "medium",
        project_type: "feature",
        dry_run: false,
      },
      logger,
    );

    assertToolSuccess(result);
    const data = result._meta?.data as Record<string, unknown>;
    expect(data.validation.valid).toBe(false);
    expect(data.validation.errors.length).toBeGreaterThan(0);
    expect(data.bootstrap).toBeUndefined();
    expect(mockBootstrapProject).not.toHaveBeenCalled();
  });
});
