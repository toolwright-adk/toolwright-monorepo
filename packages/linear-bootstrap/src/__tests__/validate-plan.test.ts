import { describe, it, expect } from "vitest";
import { validatePlan } from "../tools/validate-plan.js";
import type { Plan } from "../types.js";

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
            depends_on: [],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("validatePlan", () => {
  it("passes a valid plan with no errors or warnings", () => {
    const result = validatePlan(makePlan());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("detects circular dependencies (A -> B -> A)", () => {
    const plan = makePlan({
      epics: [
        {
          title: "Epic 1",
          description: "desc",
          milestone: "M1",
          issues: [
            {
              title: "Task A",
              labels: [],
              priority: 2,
              depends_on: ["Task B"],
            },
            {
              title: "Task B",
              labels: [],
              priority: 2,
              depends_on: ["Task A"],
            },
          ],
        },
      ],
    });
    const result = validatePlan(plan);
    expect(result.valid).toBe(false);
    const cycleCodes = result.errors.filter(
      (e) => e.code === "CIRCULAR_DEPENDENCY",
    );
    expect(cycleCodes.length).toBeGreaterThan(0);
    expect(cycleCodes[0].message).toContain("Task A");
    expect(cycleCodes[0].message).toContain("Task B");
  });

  it("detects longer cycles (A -> B -> C -> A)", () => {
    const plan = makePlan({
      epics: [
        {
          title: "Epic 1",
          description: "desc",
          milestone: "M1",
          issues: [
            {
              title: "Task A",
              labels: [],
              priority: 2,
              depends_on: ["Task C"],
            },
            {
              title: "Task B",
              labels: [],
              priority: 2,
              depends_on: ["Task A"],
            },
            {
              title: "Task C",
              labels: [],
              priority: 2,
              depends_on: ["Task B"],
            },
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

  it("detects orphaned depends_on references", () => {
    const plan = makePlan({
      epics: [
        {
          title: "Epic 1",
          description: "desc",
          milestone: "M1",
          issues: [
            {
              title: "Task A",
              labels: [],
              priority: 2,
              depends_on: ["Nonexistent Task"],
            },
          ],
        },
      ],
    });
    const result = validatePlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "ORPHANED_DEPENDENCY")).toBe(
      true,
    );
    expect(result.errors[0].message).toContain("Nonexistent Task");
  });

  it("detects undefined milestone references", () => {
    const plan = makePlan({
      epics: [
        {
          title: "Epic 1",
          description: "desc",
          milestone: "NonexistentMilestone",
          issues: [
            {
              title: "Task A",
              labels: [],
              priority: 2,
              depends_on: [],
            },
          ],
        },
      ],
    });
    const result = validatePlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "UNDEFINED_MILESTONE")).toBe(
      true,
    );
    expect(result.errors[0].message).toContain("NonexistentMilestone");
  });

  it("errors on empty epic (0 issues)", () => {
    const plan = makePlan({
      epics: [
        {
          title: "Empty Epic",
          description: "desc",
          milestone: "M1",
          issues: [],
        },
      ],
    });
    const result = validatePlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "EMPTY_EPIC")).toBe(true);
  });

  it("warns on large epic (>12 issues)", () => {
    const issues = Array.from({ length: 13 }, (_, i) => ({
      title: `Task ${i + 1}`,
      labels: [],
      priority: 3 as const,
      depends_on: [],
    }));
    const plan = makePlan({
      epics: [
        {
          title: "Large Epic",
          description: "desc",
          milestone: "M1",
          issues,
        },
      ],
    });
    const result = validatePlan(plan);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.code === "LARGE_EPIC")).toBe(true);
  });

  it("warns on high estimates (>5)", () => {
    const plan = makePlan({
      epics: [
        {
          title: "Epic 1",
          description: "desc",
          milestone: "M1",
          issues: [
            {
              title: "Big Task",
              labels: [],
              priority: 2,
              depends_on: [],
              estimate: 8,
            },
          ],
        },
      ],
    });
    const result = validatePlan(plan);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.code === "HIGH_ESTIMATE")).toBe(true);
  });

  it("detects duplicate issue titles across epics", () => {
    const plan = makePlan({
      epics: [
        {
          title: "Epic 1",
          description: "desc",
          milestone: "M1",
          issues: [
            {
              title: "Duplicate Task",
              labels: [],
              priority: 2,
              depends_on: [],
            },
          ],
        },
        {
          title: "Epic 2",
          description: "desc",
          milestone: "M1",
          issues: [
            {
              title: "Duplicate Task",
              labels: [],
              priority: 2,
              depends_on: [],
            },
          ],
        },
      ],
    });
    const result = validatePlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "DUPLICATE_TITLE")).toBe(true);
  });

  it("warns on empty epic descriptions", () => {
    const plan = makePlan({
      epics: [
        {
          title: "Epic 1",
          description: "",
          milestone: "M1",
          issues: [
            {
              title: "Task A",
              labels: [],
              priority: 2,
              depends_on: [],
            },
          ],
        },
      ],
    });
    const result = validatePlan(plan);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.code === "EMPTY_DESCRIPTION")).toBe(
      true,
    );
  });

  it("warns when include_infrastructure is set but no infra epic exists", () => {
    const result = validatePlan(makePlan(), {
      include_infrastructure: true,
    });
    expect(result.valid).toBe(true);
    expect(
      result.warnings.some((w) => w.code === "NO_INFRASTRUCTURE_EPIC"),
    ).toBe(true);
  });

  it("does not warn about infra when preference is not set", () => {
    const result = validatePlan(makePlan());
    expect(
      result.warnings.some((w) => w.code === "NO_INFRASTRUCTURE_EPIC"),
    ).toBe(false);
  });

  it("warns when plan is too small for requested complexity", () => {
    // Default plan has 1 milestone, 1 epic, 2 issues — too small for "large"
    const result = validatePlan(makePlan(), undefined, "large");
    expect(result.valid).toBe(true);
    const scaleWarnings = result.warnings.filter(
      (w) => w.code === "SCALE_MISMATCH",
    );
    expect(scaleWarnings.length).toBeGreaterThan(0);
    expect(scaleWarnings.some((w) => w.message.includes("milestones"))).toBe(
      true,
    );
    expect(scaleWarnings.some((w) => w.message.includes("epics"))).toBe(true);
    expect(scaleWarnings.some((w) => w.message.includes("issues"))).toBe(true);
  });

  it("does not warn when plan matches requested complexity", () => {
    // 1 milestone, 1 epic with 2 issues — doesn't match "small" either (needs 3-5 epics)
    // Build a plan that fits "small": 1 milestone, 3 epics, 10 issues
    const smallPlan = makePlan({
      milestones: [{ name: "M1", description: "desc", sort_order: 0 }],
      epics: Array.from({ length: 3 }, (_, i) => ({
        title: `Epic ${i + 1}`,
        description: `desc ${i + 1}`,
        milestone: "M1",
        issues: Array.from({ length: 4 }, (_, j) => ({
          title: `E${i + 1} Task ${j + 1}`,
          labels: [],
          priority: 2 as const,
          depends_on: [],
        })),
      })),
    });
    const result = validatePlan(smallPlan, undefined, "small");
    expect(result.valid).toBe(true);
    expect(
      result.warnings.filter((w) => w.code === "SCALE_MISMATCH"),
    ).toHaveLength(0);
  });

  it("does not warn about scale when complexity is not provided", () => {
    const result = validatePlan(makePlan());
    expect(
      result.warnings.filter((w) => w.code === "SCALE_MISMATCH"),
    ).toHaveLength(0);
  });
});
