import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  storePlan,
  retrievePlan,
  resolvePlan,
  clearPlanCache,
} from "../plan-cache.js";
import type { Plan } from "../types.js";

function makePlan(name = "Test"): Plan {
  return {
    project: { name, description: "desc" },
    milestones: [{ name: "M1", description: "m", sort_order: 0 }],
    epics: [
      {
        title: "E1",
        description: "e",
        milestone: "M1",
        issues: [{ title: "I1", priority: 2, labels: [], depends_on: [] }],
      },
    ],
  };
}

describe("plan-cache", () => {
  beforeEach(() => {
    clearPlanCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("storePlan / retrievePlan", () => {
    it("stores and retrieves a plan by ID", () => {
      const plan = makePlan();
      const id = storePlan(plan);
      expect(id).toBeTruthy();
      expect(retrievePlan(id)).toEqual(plan);
    });

    it("returns undefined for unknown ID", () => {
      expect(retrievePlan("nonexistent")).toBeUndefined();
    });

    it("generates unique IDs for each plan", () => {
      const id1 = storePlan(makePlan("A"));
      const id2 = storePlan(makePlan("B"));
      expect(id1).not.toBe(id2);
    });
  });

  describe("TTL expiration", () => {
    it("expires plans after 30 minutes", () => {
      vi.useFakeTimers();
      const plan = makePlan();
      const id = storePlan(plan);

      // Still available at 29 minutes
      vi.advanceTimersByTime(29 * 60 * 1000);
      expect(retrievePlan(id)).toEqual(plan);

      // Gone at 31 minutes
      vi.advanceTimersByTime(2 * 60 * 1000);
      expect(retrievePlan(id)).toBeUndefined();
    });
  });

  describe("capacity limits", () => {
    it("evicts oldest entries when at max capacity (50)", () => {
      const firstId = storePlan(makePlan("first"));

      // Fill to capacity
      for (let i = 0; i < 49; i++) {
        storePlan(makePlan(`plan-${i}`));
      }

      // First should still be there (50 total)
      expect(retrievePlan(firstId)).toBeTruthy();

      // Adding one more should evict the first
      storePlan(makePlan("overflow"));
      expect(retrievePlan(firstId)).toBeUndefined();
    });
  });

  describe("resolvePlan", () => {
    it("resolves by inline plan", () => {
      const plan = makePlan();
      expect(resolvePlan({ plan })).toEqual(plan);
    });

    it("resolves by plan_id", () => {
      const plan = makePlan();
      const id = storePlan(plan);
      expect(resolvePlan({ plan_id: id })).toEqual(plan);
    });

    it("throws for expired plan_id", () => {
      vi.useFakeTimers();
      const id = storePlan(makePlan());
      vi.advanceTimersByTime(31 * 60 * 1000);
      expect(() => resolvePlan({ plan_id: id })).toThrow("Plan not found");
    });

    it("throws when neither plan nor plan_id provided", () => {
      expect(() => resolvePlan({})).toThrow(
        "Either plan or plan_id is required",
      );
    });

    it("prefers inline plan over plan_id", () => {
      const inlinePlan = makePlan("inline");
      const cachedPlan = makePlan("cached");
      const id = storePlan(cachedPlan);
      expect(resolvePlan({ plan: inlinePlan, plan_id: id })).toEqual(
        inlinePlan,
      );
    });
  });
});
