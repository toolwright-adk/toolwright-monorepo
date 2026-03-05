import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createTestContext,
  assertToolSuccess,
} from "@toolwright-adk/shared/testing";
import {
  createLogger,
  PartialExecutionError,
  ToolInputError,
} from "@toolwright-adk/shared";
import { clearPlanCache } from "../plan-cache.js";
import { clearWorkspaceCache } from "../workspace-cache.js";
import type { Plan } from "../types.js";

const mockGetProjectByName = vi.fn();
const mockCreateProject = vi.fn();
const mockCreateMilestone = vi.fn();
const mockCreateLabel = vi.fn();
const mockCreateIssue = vi.fn();
const mockSetDependency = vi.fn();

vi.mock("../linear/client.js", () => ({
  LinearApiClient: vi.fn().mockImplementation(() => ({
    getProjectByName: mockGetProjectByName,
    createProject: mockCreateProject,
    createMilestone: mockCreateMilestone,
    createLabel: mockCreateLabel,
    createIssue: mockCreateIssue,
    setDependency: mockSetDependency,
  })),
}));

import { bootstrapProject } from "../tools/bootstrap-project.js";

const logger = createLogger("test", { level: "error" });

function makePlan(overrides?: Partial<Plan>): Plan {
  return {
    project: { name: "Test Project", description: "A test project" },
    milestones: [{ name: "M1", description: "First milestone", sort_order: 0 }],
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
          {
            title: "Issue B",
            labels: ["frontend"],
            priority: 3,
            depends_on: ["Issue A"],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("bootstrapProject", () => {
  let ctx: ReturnType<typeof createTestContext>;

  beforeEach(() => {
    ctx = createTestContext({ LINEAR_API_KEY: "test-key" });
    clearPlanCache();
    clearWorkspaceCache();
  });

  afterEach(async () => {
    await ctx.teardown();
    vi.clearAllMocks();
  });

  it("creates full project with milestones, labels, epics, issues, and dependencies", async () => {
    mockGetProjectByName.mockResolvedValue(null);
    mockCreateProject.mockResolvedValue({ id: "project-1" });
    mockCreateMilestone.mockResolvedValue({ id: "milestone-1" });
    mockCreateLabel.mockResolvedValueOnce({ id: "label-backend" });
    mockCreateLabel.mockResolvedValueOnce({ id: "label-frontend" });
    // First createIssue = epic parent, second = Issue A, third = Issue B
    mockCreateIssue.mockResolvedValueOnce({ id: "epic-issue-1" });
    mockCreateIssue.mockResolvedValueOnce({ id: "issue-a" });
    mockCreateIssue.mockResolvedValueOnce({ id: "issue-b" });
    mockSetDependency.mockResolvedValue(undefined);

    const result = await bootstrapProject(
      { plan: makePlan(), team_id: "team-1", dry_run: false },
      logger,
    );

    assertToolSuccess(result);
    const data = result._meta?.data as any;
    expect(data.project_id).toBe("project-1");
    expect(data.milestone_ids).toEqual({ M1: "milestone-1" });
    expect(data.epic_ids).toEqual({ "Epic 1": "epic-issue-1" });
    expect(data.issue_ids).toHaveProperty("Issue A", "issue-a");
    expect(data.issue_ids).toHaveProperty("Issue B", "issue-b");
    expect(data.dependency_count).toBe(1);
    expect(mockSetDependency).toHaveBeenCalledTimes(1);
  });

  it("returns validation result on dry_run without calling client", async () => {
    const result = await bootstrapProject(
      { plan: makePlan(), team_id: "team-1", dry_run: true },
      logger,
    );

    assertToolSuccess(result);
    const data = result._meta?.data as any;
    expect(data.valid).toBeDefined();
    expect(mockGetProjectByName).not.toHaveBeenCalled();
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  it("returns validation result with valid:false for invalid plan", async () => {
    // Plan with circular deps: A depends on B, B depends on A
    const plan = makePlan({
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
    });

    const result = await bootstrapProject(
      { plan, team_id: "team-1", dry_run: false },
      logger,
    );

    assertToolSuccess(result);
    const data = result._meta?.data as any;
    expect(data.valid).toBe(false);
    expect(data.errors.length).toBeGreaterThan(0);
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  it("returns early with existing project ID for idempotency", async () => {
    mockGetProjectByName.mockResolvedValue({ id: "existing-project" });

    const result = await bootstrapProject(
      { plan: makePlan(), team_id: "team-1", dry_run: false },
      logger,
    );

    assertToolSuccess(result);
    const data = result._meta?.data as any;
    expect(data.project_id).toBe("existing-project");
    expect(data.milestone_ids).toEqual({});
    expect(mockCreateProject).not.toHaveBeenCalled();
    expect(mockCreateMilestone).not.toHaveBeenCalled();
  });

  it("skips failed label creation and continues bootstrap", async () => {
    mockGetProjectByName.mockResolvedValue(null);
    mockCreateProject.mockResolvedValue({ id: "project-1" });
    mockCreateMilestone.mockResolvedValue({ id: "milestone-1" });
    // Label creation fails
    mockCreateLabel.mockRejectedValue(new Error("Label creation failed"));
    // Epic + issues still succeed
    mockCreateIssue.mockResolvedValueOnce({ id: "epic-issue-1" });
    mockCreateIssue.mockResolvedValueOnce({ id: "issue-a" });
    mockCreateIssue.mockResolvedValueOnce({ id: "issue-b" });
    mockSetDependency.mockResolvedValue(undefined);

    const result = await bootstrapProject(
      { plan: makePlan(), team_id: "team-1", dry_run: false },
      logger,
    );

    assertToolSuccess(result);
    const data = result._meta?.data as any;
    expect(data.project_id).toBe("project-1");
    // Labels failed but bootstrap continued
    expect(Object.keys(data.label_ids)).toHaveLength(0);
  });

  it("throws PartialExecutionError when child issue creation fails", async () => {
    mockGetProjectByName.mockResolvedValue(null);
    mockCreateProject.mockResolvedValue({ id: "project-1" });
    mockCreateMilestone.mockResolvedValue({ id: "milestone-1" });
    mockCreateLabel.mockResolvedValue({ id: "label-1" });
    // Epic parent succeeds
    mockCreateIssue.mockResolvedValueOnce({ id: "epic-issue-1" });
    // First child succeeds
    mockCreateIssue.mockResolvedValueOnce({ id: "issue-a" });
    // Second child fails
    mockCreateIssue.mockRejectedValueOnce(new Error("Issue creation failed"));

    try {
      await bootstrapProject(
        { plan: makePlan(), team_id: "team-1", dry_run: false },
        logger,
      );
      // Should not reach here
      expect.fail("Expected PartialExecutionError to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PartialExecutionError);
      const partial = err as PartialExecutionError;
      expect(partial.completed.length).toBeGreaterThan(0);
      expect(partial.failed.length).toBeGreaterThan(0);
    }
  });

  it("throws ToolInputError when neither plan nor plan_id is provided", async () => {
    await expect(
      bootstrapProject({ team_id: "team-1", dry_run: false } as any, logger),
    ).rejects.toThrow(ToolInputError);
  });
});
