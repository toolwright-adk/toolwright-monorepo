import { describe, it, expect, beforeEach } from "vitest";
import {
  storePlan,
  retrievePlan,
  resolvePlan,
  clearPlanCache,
} from "../plan-cache.js";
import type { Plan } from "../types.js";

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
          title: "Task A",
          labels: ["backend"],
          priority: 2,
          depends_on: [],
        },
      ],
    },
  ],
};

describe("plan-cache", () => {
  beforeEach(() => {
    clearPlanCache();
  });

  it("stores and retrieves a plan", () => {
    const id = storePlan(validPlan);
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    const retrieved = retrievePlan(id);
    expect(retrieved).toEqual(validPlan);
  });

  it("returns undefined for unknown plan_id", () => {
    expect(retrievePlan("nonexistent")).toBeUndefined();
  });

  it("resolvePlan returns plan when provided inline", () => {
    const plan = resolvePlan({ plan: validPlan });
    expect(plan).toEqual(validPlan);
  });

  it("resolvePlan resolves plan_id from cache", () => {
    const id = storePlan(validPlan);
    const plan = resolvePlan({ plan_id: id });
    expect(plan).toEqual(validPlan);
  });

  it("resolvePlan throws for expired/missing plan_id", () => {
    expect(() => resolvePlan({ plan_id: "gone" })).toThrow(/Plan not found/);
  });

  it("resolvePlan throws when neither plan nor plan_id provided", () => {
    expect(() => resolvePlan({})).toThrow(/Either plan or plan_id is required/);
  });

  it("prefers inline plan over plan_id", () => {
    const id = storePlan({
      ...validPlan,
      project: { name: "Cached", description: "cached" },
    });
    const plan = resolvePlan({ plan: validPlan, plan_id: id });
    expect(plan.project.name).toBe("Test");
  });
});
