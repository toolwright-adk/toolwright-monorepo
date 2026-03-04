import { describe, it, expect } from "vitest";
import {
  buildSystemPrompt,
  buildWorkspaceContextSection,
  getArchetype,
  ARCHETYPES,
} from "../planning/prompts.js";
import type { GeneratePlanInput, WorkspaceContext } from "../types.js";

function makeArgs(overrides?: Partial<GeneratePlanInput>): GeneratePlanInput {
  return {
    description: "Test project",
    team_id: "team-1",
    complexity: "medium",
    project_type: "feature",
    ...overrides,
  };
}

function makeWorkspaceContext(
  overrides?: Partial<WorkspaceContext>,
): WorkspaceContext {
  return {
    team_name: "Engineering",
    workflow_states: [
      { id: "s1", name: "Triage", type: "triage" },
      { id: "s2", name: "Backlog", type: "backlog" },
      { id: "s3", name: "In Progress", type: "started" },
      { id: "s4", name: "Done", type: "completed" },
    ],
    default_state_name: "Backlog",
    default_state_id: "s2",
    labels: [
      { id: "l1", name: "backend" },
      { id: "l2", name: "frontend" },
      { id: "l3", name: "bug", parent_name: "Type" },
    ],
    custom_fields: [],
    cycles_enabled: false,
    existing_projects: [],
    ...overrides,
  };
}

describe("ARCHETYPES", () => {
  it("each archetype has 3-6 milestones", () => {
    for (const [type, arch] of Object.entries(ARCHETYPES)) {
      expect(arch.milestones.length, `${type}`).toBeGreaterThanOrEqual(3);
      expect(arch.milestones.length, `${type}`).toBeLessThanOrEqual(6);
    }
  });

  it("each archetype has 3-8 epics", () => {
    for (const [type, arch] of Object.entries(ARCHETYPES)) {
      expect(arch.epics.length, `${type}`).toBeGreaterThanOrEqual(3);
      expect(arch.epics.length, `${type}`).toBeLessThanOrEqual(8);
    }
  });

  it("getArchetype returns correct archetype for each type", () => {
    expect(getArchetype("feature").milestones).toContain("Spec & design");
    expect(getArchetype("infrastructure").milestones).toContain("Prototype");
    expect(getArchetype("api").milestones).toContain("API design sign-off");
    expect(getArchetype("migration").milestones).toContain("Cutover");
  });
});

describe("buildSystemPrompt", () => {
  it("includes feature archetype scaffolding by default", () => {
    const prompt = buildSystemPrompt(makeArgs());
    expect(prompt).toContain("Project Type: feature");
    expect(prompt).toContain("Spec & design");
    expect(prompt).toContain("Backend APIs");
  });

  it("uses infrastructure archetype", () => {
    const prompt = buildSystemPrompt(
      makeArgs({ project_type: "infrastructure" }),
    );
    expect(prompt).toContain("Project Type: infrastructure");
    expect(prompt).toContain("Prototype");
    expect(prompt).toContain("Core infra changes");
    expect(prompt).not.toContain("Spec & design");
  });

  it("uses api archetype", () => {
    const prompt = buildSystemPrompt(makeArgs({ project_type: "api" }));
    expect(prompt).toContain("Project Type: api");
    expect(prompt).toContain("API design sign-off");
    expect(prompt).toContain("Auth & rate limiting");
  });

  it("uses migration archetype", () => {
    const prompt = buildSystemPrompt(makeArgs({ project_type: "migration" }));
    expect(prompt).toContain("Project Type: migration");
    expect(prompt).toContain("Dual-write in place");
    expect(prompt).toContain("Cutover runbook");
  });

  it("includes general rules", () => {
    const prompt = buildSystemPrompt(makeArgs());
    expect(prompt).toContain("OUTCOME");
    expect(prompt).toContain("boilerplate");
    expect(prompt).toContain("3-6 milestones, 3-8 epics");
  });

  it("respects complexity scale guide", () => {
    const small = buildSystemPrompt(makeArgs({ complexity: "small" }));
    expect(small).toContain("1-2 milestones, 3-5 epics, 10-25 issues");

    const large = buildSystemPrompt(makeArgs({ complexity: "large" }));
    expect(large).toContain("4-6 milestones, 10-20 epics, 50-120 issues");
  });

  it("includes workspace context when provided", () => {
    const ctx = makeWorkspaceContext();
    const prompt = buildSystemPrompt(makeArgs(), ctx);
    expect(prompt).toContain("Team Context");
    expect(prompt).toContain("backend");
    expect(prompt).toContain("Reuse existing label names");
  });

  it("omits workspace section when context is undefined", () => {
    const prompt = buildSystemPrompt(makeArgs());
    expect(prompt).not.toContain("Team Context");
  });
});

describe("buildWorkspaceContextSection", () => {
  it("includes existing labels instruction", () => {
    const section = buildWorkspaceContextSection(makeWorkspaceContext());
    expect(section).toContain("backend");
    expect(section).toContain("Reuse existing label names");
  });

  it("includes triage warning when triage state exists", () => {
    const section = buildWorkspaceContextSection(makeWorkspaceContext());
    expect(section).toContain("triage");
    expect(section).toContain("Never set issues to bypass triage");
  });

  it("omits triage warning when no triage state", () => {
    const ctx = makeWorkspaceContext({
      workflow_states: [
        { id: "s1", name: "Backlog", type: "backlog" },
        { id: "s2", name: "Done", type: "completed" },
      ],
    });
    const section = buildWorkspaceContextSection(ctx);
    expect(section).not.toContain("bypass triage");
  });

  it("includes existing projects collision warning excluding completed", () => {
    const ctx = makeWorkspaceContext({
      existing_projects: [
        { id: "p1", name: "Auth Revamp", state: "In Progress" },
        { id: "p2", name: "Old Thing", state: "Completed" },
      ],
    });
    const section = buildWorkspaceContextSection(ctx);
    expect(section).toContain("Auth Revamp");
    expect(section).not.toContain("Old Thing");
  });

  it("includes required custom fields note", () => {
    const ctx = makeWorkspaceContext({
      custom_fields: [
        { id: "cf1", name: "Sprint Goal", required: true },
        { id: "cf2", name: "Category", required: false },
      ],
    });
    const section = buildWorkspaceContextSection(ctx);
    expect(section).toContain("Sprint Goal");
    expect(section).not.toContain("Category");
  });

  it("includes cycle info when enabled", () => {
    const ctx = makeWorkspaceContext({
      cycles_enabled: true,
      active_cycle: {
        id: "c1",
        name: "Sprint 5",
        starts_at: "2026-03-01T00:00:00.000Z",
        ends_at: "2026-03-14T00:00:00.000Z",
      },
    });
    const section = buildWorkspaceContextSection(ctx);
    expect(section).toContain("Sprint 5");
  });
});
