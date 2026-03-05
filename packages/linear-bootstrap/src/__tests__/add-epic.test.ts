import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createTestContext,
  assertToolSuccess,
} from "@toolwright-adk/shared/testing";
import { createLogger, PartialExecutionError } from "@toolwright-adk/shared";

const mockGetProjectIssues = vi.fn();
const mockCreateIssue = vi.fn();
const mockSetDependency = vi.fn();

vi.mock("../linear/client.js", () => ({
  LinearApiClient: vi.fn().mockImplementation(() => ({
    getProjectIssues: mockGetProjectIssues,
    createIssue: mockCreateIssue,
    setDependency: mockSetDependency,
  })),
}));

import { addEpic } from "../tools/add-epic.js";

const logger = createLogger("test", { level: "error" });

const baseArgs = {
  project_id: "project-1",
  team_id: "team-1",
  epic: {
    title: "Epic 1",
    description: "First epic",
    milestone: "M1",
    issues: [
      {
        title: "Issue A",
        labels: ["backend"],
        priority: 2,
        depends_on: [] as string[],
      },
      {
        title: "Issue B",
        labels: ["frontend"],
        priority: 3,
        depends_on: [] as string[],
      },
    ],
  },
};

describe("addEpic", () => {
  let ctx: ReturnType<typeof createTestContext>;

  beforeEach(() => {
    ctx = createTestContext({ LINEAR_API_KEY: "test-key" });
  });

  afterEach(async () => {
    await ctx.teardown();
    vi.clearAllMocks();
  });

  it("creates epic with child issues", async () => {
    mockGetProjectIssues.mockResolvedValue([]);
    mockCreateIssue.mockResolvedValueOnce({ id: "epic-issue-1" });
    mockCreateIssue.mockResolvedValueOnce({ id: "issue-a" });
    mockCreateIssue.mockResolvedValueOnce({ id: "issue-b" });

    const result = await addEpic(baseArgs, logger);
    assertToolSuccess(result);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = result._meta?.data as any;
    expect(data.epic_id).toBe("epic-issue-1");
    expect(data.issue_ids).toEqual({
      "Issue A": "issue-a",
      "Issue B": "issue-b",
    });
  });

  it("returns early when epic with matching title already exists", async () => {
    mockGetProjectIssues.mockResolvedValue([
      { id: "existing-epic-1", title: "Epic 1" },
    ]);

    const result = await addEpic(baseArgs, logger);
    assertToolSuccess(result);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = result._meta?.data as any;
    expect(data.epic_id).toBe("existing-epic-1");
    expect(data.issue_ids).toEqual({});
    expect(mockCreateIssue).not.toHaveBeenCalled();
  });

  it("matches existing epic title case-insensitively", async () => {
    mockGetProjectIssues.mockResolvedValue([
      { id: "existing-epic-1", title: "EPIC 1" },
    ]);

    const result = await addEpic(baseArgs, logger);
    assertToolSuccess(result);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = result._meta?.data as any;
    expect(data.epic_id).toBe("existing-epic-1");
    expect(data.issue_ids).toEqual({});
    expect(mockCreateIssue).not.toHaveBeenCalled();
  });

  it("throws PartialExecutionError when child issue creation fails", async () => {
    mockGetProjectIssues.mockResolvedValue([]);
    // Epic parent succeeds
    mockCreateIssue.mockResolvedValueOnce({ id: "epic-issue-1" });
    // First child succeeds
    mockCreateIssue.mockResolvedValueOnce({ id: "issue-a" });
    // Second child fails
    mockCreateIssue.mockRejectedValueOnce(new Error("Issue creation failed"));

    try {
      await addEpic(baseArgs, logger);
      expect.fail("Expected PartialExecutionError to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PartialExecutionError);
      const partial = err as PartialExecutionError;
      expect(partial.completed).toContain("epic:epic-issue-1");
      expect(partial.completed).toContain("issue:issue-a");
      expect(partial.failed).toContain("issue:Issue B");
    }
  });

  it("continues successfully when setDependency fails", async () => {
    const argsWithDeps = {
      ...baseArgs,
      epic: {
        ...baseArgs.epic,
        issues: [
          {
            title: "Issue A",
            labels: ["backend"],
            priority: 2,
            depends_on: [] as string[],
          },
          {
            title: "Issue B",
            labels: ["frontend"],
            priority: 3,
            depends_on: ["Issue A"],
          },
        ],
      },
    };

    mockGetProjectIssues.mockResolvedValue([]);
    mockCreateIssue.mockResolvedValueOnce({ id: "epic-issue-1" });
    mockCreateIssue.mockResolvedValueOnce({ id: "issue-a" });
    mockCreateIssue.mockResolvedValueOnce({ id: "issue-b" });
    mockSetDependency.mockRejectedValue(new Error("Dependency failed"));

    const result = await addEpic(argsWithDeps, logger);
    assertToolSuccess(result);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = result._meta?.data as any;
    expect(data.epic_id).toBe("epic-issue-1");
    expect(data.issue_ids).toEqual({
      "Issue A": "issue-a",
      "Issue B": "issue-b",
    });
    // setDependency was called but failed — non-critical, result still succeeds
    expect(mockSetDependency).toHaveBeenCalledTimes(1);
  });
});
