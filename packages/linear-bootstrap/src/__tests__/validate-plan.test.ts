import { describe, it, expect } from "vitest";
import { validatePlan } from "../tools/validate-plan.js";
import type { Plan } from "../types.js";

function makePlan(overrides?: Partial<Plan>): Plan {
  return {
    project: { name: "Test Project", description: "A test" },
    milestones: [{ name: "M1", description: "First milestone", sort_order: 0 }],
    epics: [
      {
        title: "Epic 1",
        description: "First epic",
        milestone: "M1",
        issues: [
          { title: "Issue 1", priority: 2, labels: [], depends_on: [] },
          { title: "Issue 2", priority: 3, labels: [], depends_on: [] },
        ],
      },
    ],
    ...overrides,
  };
}

describe("validatePlan", () => {
  it("valid plan passes with no errors or warnings", () => {
    const result = validatePlan(makePlan());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  describe("circular dependencies", () => {
    it("detects simple A→B→A cycle", () => {
      const plan = makePlan({
        epics: [
          {
            title: "Epic 1",
            description: "e",
            milestone: "M1",
            issues: [
              { title: "A", priority: 2, labels: [], depends_on: ["B"] },
              { title: "B", priority: 2, labels: [], depends_on: ["A"] },
            ],
          },
        ],
      });
      const result = validatePlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "CIRCULAR_DEPENDENCY")).toBe(
        true,
      );
    });

    it("detects A→B→C→A cycle", () => {
      const plan = makePlan({
        epics: [
          {
            title: "Epic 1",
            description: "e",
            milestone: "M1",
            issues: [
              { title: "A", priority: 2, labels: [], depends_on: ["C"] },
              { title: "B", priority: 2, labels: [], depends_on: ["A"] },
              { title: "C", priority: 2, labels: [], depends_on: ["B"] },
            ],
          },
        ],
      });
      const result = validatePlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "CIRCULAR_DEPENDENCY")).toBe(
        true,
      );
    });
  });

  describe("orphaned dependencies", () => {
    it("detects dependency on non-existent issue", () => {
      const plan = makePlan({
        epics: [
          {
            title: "Epic 1",
            description: "e",
            milestone: "M1",
            issues: [
              { title: "A", priority: 2, labels: [], depends_on: ["Ghost"] },
            ],
          },
        ],
      });
      const result = validatePlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "ORPHANED_DEPENDENCY")).toBe(
        true,
      );
      expect(result.errors[0].message).toContain("Ghost");
    });
  });

  describe("undefined milestones", () => {
    it("detects epic referencing undefined milestone", () => {
      const plan = makePlan({
        epics: [
          {
            title: "Epic 1",
            description: "e",
            milestone: "Nonexistent",
            issues: [{ title: "A", priority: 2, labels: [], depends_on: [] }],
          },
        ],
      });
      const result = validatePlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "UNDEFINED_MILESTONE")).toBe(
        true,
      );
    });
  });

  describe("epic sizes", () => {
    it("errors on empty epic", () => {
      const plan = makePlan({
        epics: [
          {
            title: "Empty Epic",
            description: "e",
            milestone: "M1",
            issues: [],
          },
        ],
      });
      const result = validatePlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "EMPTY_EPIC")).toBe(true);
    });

    it("warns on oversized epic (>12 issues)", () => {
      const issues = Array.from({ length: 15 }, (_, i) => ({
        title: `Issue ${i}`,
        priority: 2 as const,
        labels: [] as string[],
        depends_on: [] as string[],
      }));
      const plan = makePlan({
        epics: [
          { title: "Big Epic", description: "e", milestone: "M1", issues },
        ],
      });
      const result = validatePlan(plan);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.code === "LARGE_EPIC")).toBe(true);
    });
  });

  describe("duplicate titles", () => {
    it("detects duplicate issue titles (case-insensitive)", () => {
      const plan = makePlan({
        epics: [
          {
            title: "Epic 1",
            description: "e",
            milestone: "M1",
            issues: [
              { title: "Setup DB", priority: 2, labels: [], depends_on: [] },
              { title: "setup db", priority: 2, labels: [], depends_on: [] },
            ],
          },
        ],
      });
      const result = validatePlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "DUPLICATE_TITLE")).toBe(
        true,
      );
    });

    it("detects duplicate epic titles", () => {
      const plan = makePlan({
        epics: [
          {
            title: "Same Name",
            description: "e1",
            milestone: "M1",
            issues: [{ title: "A", priority: 2, labels: [], depends_on: [] }],
          },
          {
            title: "Same Name",
            description: "e2",
            milestone: "M1",
            issues: [{ title: "B", priority: 2, labels: [], depends_on: [] }],
          },
        ],
      });
      const result = validatePlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "DUPLICATE_TITLE")).toBe(
        true,
      );
    });
  });

  describe("estimates", () => {
    it("warns on high estimates (>5 points)", () => {
      const plan = makePlan({
        epics: [
          {
            title: "Epic 1",
            description: "e",
            milestone: "M1",
            issues: [
              {
                title: "Big Task",
                priority: 2,
                estimate: 8,
                labels: [],
                depends_on: [],
              },
            ],
          },
        ],
      });
      const result = validatePlan(plan);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.code === "HIGH_ESTIMATE")).toBe(
        true,
      );
    });
  });

  describe("empty descriptions", () => {
    it("warns on epic with empty description", () => {
      const plan = makePlan({
        epics: [
          {
            title: "Epic 1",
            description: "  ",
            milestone: "M1",
            issues: [{ title: "A", priority: 2, labels: [], depends_on: [] }],
          },
        ],
      });
      const result = validatePlan(plan);
      expect(result.warnings.some((w) => w.code === "EMPTY_DESCRIPTION")).toBe(
        true,
      );
    });
  });

  describe("scale checks", () => {
    it("warns when plan exceeds complexity range", () => {
      const issues = Array.from({ length: 8 }, (_, i) => ({
        title: `Issue ${i}`,
        priority: 2 as const,
        labels: [] as string[],
        depends_on: [] as string[],
      }));
      const plan = makePlan({
        milestones: [
          { name: "M1", description: "m1", sort_order: 0 },
          { name: "M2", description: "m2", sort_order: 1 },
          { name: "M3", description: "m3", sort_order: 2 },
          { name: "M4", description: "m4", sort_order: 3 },
          { name: "M5", description: "m5", sort_order: 4 },
        ],
        epics: [{ title: "E1", description: "e", milestone: "M1", issues }],
      });
      const result = validatePlan(plan, undefined, "small");
      expect(result.warnings.some((w) => w.code === "SCALE_MISMATCH")).toBe(
        true,
      );
    });

    it("no scale warning when complexity not provided", () => {
      const result = validatePlan(makePlan());
      expect(result.warnings.some((w) => w.code === "SCALE_MISMATCH")).toBe(
        false,
      );
    });
  });

  describe("infrastructure preference", () => {
    it("warns when include_infrastructure set but no infra epic", () => {
      const result = validatePlan(makePlan(), { include_infrastructure: true });
      expect(
        result.warnings.some((w) => w.code === "NO_INFRASTRUCTURE_EPIC"),
      ).toBe(true);
    });

    it("no warning when infra epic exists", () => {
      const plan = makePlan({
        epics: [
          {
            title: "Infrastructure Setup",
            description: "e",
            milestone: "M1",
            issues: [{ title: "A", priority: 2, labels: [], depends_on: [] }],
          },
        ],
      });
      const result = validatePlan(plan, { include_infrastructure: true });
      expect(
        result.warnings.some((w) => w.code === "NO_INFRASTRUCTURE_EPIC"),
      ).toBe(false);
    });
  });

  describe("cross-epic dependencies", () => {
    it("validates dependencies across epics", () => {
      const plan = makePlan({
        milestones: [
          { name: "M1", description: "m1", sort_order: 0 },
          { name: "M2", description: "m2", sort_order: 1 },
        ],
        epics: [
          {
            title: "Epic 1",
            description: "e1",
            milestone: "M1",
            issues: [
              { title: "Setup", priority: 1, labels: [], depends_on: [] },
            ],
          },
          {
            title: "Epic 2",
            description: "e2",
            milestone: "M2",
            issues: [
              {
                title: "Build on Setup",
                priority: 2,
                labels: [],
                depends_on: ["Setup"],
              },
            ],
          },
        ],
      });
      const result = validatePlan(plan);
      expect(result.valid).toBe(true);
    });
  });
});
