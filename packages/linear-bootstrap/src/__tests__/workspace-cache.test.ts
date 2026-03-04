import { describe, it, expect, beforeEach } from "vitest";
import {
  storeWorkspaceContext,
  retrieveWorkspaceContext,
  clearWorkspaceCache,
} from "../workspace-cache.js";
import type { WorkspaceContext } from "../types.js";

const validContext: WorkspaceContext = {
  team_name: "Engineering",
  workflow_states: [{ id: "s1", name: "Backlog", type: "backlog" }],
  default_state_id: "s1",
  default_state_name: "Backlog",
  labels: [{ id: "l1", name: "backend" }],
  custom_fields: [],
  cycles_enabled: false,
  existing_projects: [],
};

describe("workspace-cache", () => {
  beforeEach(() => {
    clearWorkspaceCache();
  });

  it("stores and retrieves workspace context by team_id", () => {
    storeWorkspaceContext("team-1", validContext);
    const retrieved = retrieveWorkspaceContext("team-1");
    expect(retrieved).toEqual(validContext);
  });

  it("returns undefined for unknown team_id", () => {
    expect(retrieveWorkspaceContext("nonexistent")).toBeUndefined();
  });

  it("overwrites context for same team_id", () => {
    storeWorkspaceContext("team-1", validContext);
    const updated = { ...validContext, team_name: "Updated" };
    storeWorkspaceContext("team-1", updated);
    expect(retrieveWorkspaceContext("team-1")?.team_name).toBe("Updated");
  });

  it("stores contexts for different teams independently", () => {
    storeWorkspaceContext("team-1", validContext);
    const ctx2 = { ...validContext, team_name: "Design" };
    storeWorkspaceContext("team-2", ctx2);
    expect(retrieveWorkspaceContext("team-1")?.team_name).toBe("Engineering");
    expect(retrieveWorkspaceContext("team-2")?.team_name).toBe("Design");
  });
});
