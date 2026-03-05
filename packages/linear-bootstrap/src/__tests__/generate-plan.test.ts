import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createTestContext,
  assertToolSuccess,
} from "@toolwright-adk/shared/testing";
import {
  createLogger,
  ExternalServiceError,
  PlanValidationError,
} from "@toolwright-adk/shared";
import { clearPlanCache } from "../plan-cache.js";
import { clearWorkspaceCache } from "../workspace-cache.js";

const mockCreate = vi.fn();

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

vi.mock("../linear/client.js", () => ({
  LinearApiClient: vi.fn().mockImplementation(() => ({
    getTeamInfo: vi.fn(),
    getTeamWorkflowStates: vi.fn(),
    getTeamLabels: vi.fn(),
    getTeamDefaultState: vi.fn(),
    getTeamProjects: vi.fn(),
    getTeamActiveCycle: vi.fn(),
  })),
}));

import { generatePlan } from "../tools/generate-plan.js";

const logger = createLogger("test", { level: "error" });

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

describe("generatePlan", () => {
  let ctx: ReturnType<typeof createTestContext>;

  beforeEach(() => {
    ctx = createTestContext({
      LLM_API_KEY: "test-key",
      LLM_BASE_URL: "https://api.example.com/v1",
      LLM_MODEL: "test-model",
    });
    clearPlanCache();
    clearWorkspaceCache();
  });

  afterEach(async () => {
    await ctx.teardown();
    vi.clearAllMocks();
  });

  it("returns plan_id and summary on success", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(validPlan) } }],
    });

    const result = await generatePlan(
      {
        description: "Build a test project",
        team_id: "team-1",
        complexity: "medium",
        project_type: "feature",
      },
      logger,
    );

    assertToolSuccess(result);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = result._meta?.data as any;
    expect(data.plan_id).toBeDefined();
    expect(typeof data.plan_id).toBe("string");
    expect(data.summary).toBeDefined();
    expect(data.summary.total_issues).toBe(1);
    expect(data.summary.total_epics).toBe(1);
    expect(data.summary.total_milestones).toBe(1);
  });

  it("throws ExternalServiceError when LLM_API_KEY is missing", async () => {
    // Remove the LLM_API_KEY set in beforeEach
    delete process.env.LLM_API_KEY;

    await expect(
      generatePlan(
        {
          description: "Build a test project",
          team_id: "team-1",
          complexity: "medium",
          project_type: "feature",
        },
        logger,
      ),
    ).rejects.toThrow(ExternalServiceError);
  });

  it("throws ExternalServiceError when OpenAI API fails", async () => {
    mockCreate.mockRejectedValue(new Error("Connection timeout"));

    await expect(
      generatePlan(
        {
          description: "Build a test project",
          team_id: "team-1",
          complexity: "medium",
          project_type: "feature",
        },
        logger,
      ),
    ).rejects.toThrow(ExternalServiceError);
  });

  it("throws PlanValidationError for invalid JSON response", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "This is not JSON at all" } }],
    });

    await expect(
      generatePlan(
        {
          description: "Build a test project",
          team_id: "team-1",
          complexity: "medium",
          project_type: "feature",
        },
        logger,
      ),
    ).rejects.toThrow(PlanValidationError);
  });

  it("extracts JSON from code fence with preamble text", async () => {
    const wrappedResponse = `Here's the plan:\n\`\`\`json\n${JSON.stringify(validPlan)}\n\`\`\`\nLet me know if you need changes.`;
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: wrappedResponse } }],
    });

    const result = await generatePlan(
      {
        description: "Build a test project",
        team_id: "team-1",
        complexity: "medium",
        project_type: "feature",
      },
      logger,
    );

    assertToolSuccess(result);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = result._meta?.data as any;
    expect(data.plan_id).toBeDefined();
    expect(data.summary.total_issues).toBe(1);
  });

  it("throws PlanValidationError for wrong schema shape", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ wrong: "shape" }),
          },
        },
      ],
    });

    await expect(
      generatePlan(
        {
          description: "Build a test project",
          team_id: "team-1",
          complexity: "medium",
          project_type: "feature",
        },
        logger,
      ),
    ).rejects.toThrow(PlanValidationError);
  });
});
