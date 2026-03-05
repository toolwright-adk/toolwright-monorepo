import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createTestContext,
  assertToolSuccess,
} from "@toolwright-adk/shared/testing";
import { createLogger } from "@toolwright-adk/shared";
import { introspectWorkspace } from "../tools/introspect-workspace.js";
import {
  clearWorkspaceCache,
  storeWorkspaceContext,
} from "../workspace-cache.js";

const mockGetTeamInfo = vi.fn();
const mockGetTeamWorkflowStates = vi.fn();
const mockGetTeamLabels = vi.fn();
const mockGetTeamDefaultState = vi.fn();
const mockGetTeamProjects = vi.fn();
const mockGetTeamActiveCycle = vi.fn();

vi.mock("../linear/client.js", () => ({
  LinearApiClient: vi.fn().mockImplementation(() => ({
    getTeamInfo: mockGetTeamInfo,
    getTeamWorkflowStates: mockGetTeamWorkflowStates,
    getTeamLabels: mockGetTeamLabels,
    getTeamDefaultState: mockGetTeamDefaultState,
    getTeamProjects: mockGetTeamProjects,
    getTeamActiveCycle: mockGetTeamActiveCycle,
  })),
}));

const logger = createLogger("test", { level: "error" });

describe("introspectWorkspace", () => {
  let ctx: ReturnType<typeof createTestContext>;

  beforeEach(() => {
    ctx = createTestContext({ LINEAR_API_KEY: "test-key" });
    clearWorkspaceCache();
    mockGetTeamInfo.mockReset();
    mockGetTeamWorkflowStates.mockReset();
    mockGetTeamLabels.mockReset();
    mockGetTeamDefaultState.mockReset();
    mockGetTeamProjects.mockReset();
    mockGetTeamActiveCycle.mockReset();
  });

  afterEach(async () => {
    await ctx.teardown();
  });

  it("returns workspace context from Linear API", async () => {
    mockGetTeamInfo.mockResolvedValue({
      name: "Engineering",
      cyclesEnabled: true,
      triageEnabled: false,
    });
    mockGetTeamWorkflowStates.mockResolvedValue([
      { id: "s1", name: "Backlog", type: "backlog" },
      { id: "s2", name: "In Progress", type: "started" },
    ]);
    mockGetTeamLabels.mockResolvedValue([
      { id: "l1", name: "backend" },
      { id: "l2", name: "frontend" },
    ]);
    mockGetTeamDefaultState.mockResolvedValue({
      id: "s1",
      name: "Backlog",
    });
    mockGetTeamProjects.mockResolvedValue([
      { id: "p1", name: "Alpha", state: "started" },
    ]);
    mockGetTeamActiveCycle.mockResolvedValue({
      id: "c1",
      name: "Cycle 5",
      starts_at: "2026-01-01T00:00:00Z",
      ends_at: "2026-01-14T00:00:00Z",
    });

    const result = await introspectWorkspace({ team_id: "team-1" }, logger);
    assertToolSuccess(result);

    const data = result._meta?.data as Record<string, unknown>;
    expect(data.team_name).toBe("Engineering");
    expect(data.workflow_states).toHaveLength(2);
    expect(data.labels).toHaveLength(2);
    expect(data.default_state_id).toBe("s1");
    expect(data.default_state_name).toBe("Backlog");
    expect(data.cycles_enabled).toBe(true);
    expect(data.active_cycle).toBeDefined();
    expect(data.active_cycle.id).toBe("c1");
    expect(data.existing_projects).toHaveLength(1);
    expect(data.custom_fields).toEqual([]);
  });

  it("returns cached context without calling client", async () => {
    const cachedContext = {
      team_name: "Cached Team",
      workflow_states: [{ id: "s1", name: "Todo", type: "unstarted" }],
      default_state_id: "s1",
      default_state_name: "Todo",
      labels: [],
      custom_fields: [],
      cycles_enabled: false,
      active_cycle: undefined,
      existing_projects: [],
    };
    storeWorkspaceContext("team-1", cachedContext);

    const result = await introspectWorkspace({ team_id: "team-1" }, logger);
    assertToolSuccess(result);

    const data = result._meta?.data as Record<string, unknown>;
    expect(data.team_name).toBe("Cached Team");

    // Client should not have been called
    expect(mockGetTeamInfo).not.toHaveBeenCalled();
    expect(mockGetTeamWorkflowStates).not.toHaveBeenCalled();
  });

  it("skips getTeamActiveCycle when cycles are disabled", async () => {
    mockGetTeamInfo.mockResolvedValue({
      name: "Design",
      cyclesEnabled: false,
      triageEnabled: false,
    });
    mockGetTeamWorkflowStates.mockResolvedValue([]);
    mockGetTeamLabels.mockResolvedValue([]);
    mockGetTeamDefaultState.mockResolvedValue(undefined);
    mockGetTeamProjects.mockResolvedValue([]);

    const result = await introspectWorkspace({ team_id: "team-2" }, logger);
    assertToolSuccess(result);

    const data = result._meta?.data as Record<string, unknown>;
    expect(data.cycles_enabled).toBe(false);
    expect(data.active_cycle).toBeUndefined();
    expect(mockGetTeamActiveCycle).not.toHaveBeenCalled();
  });
});
