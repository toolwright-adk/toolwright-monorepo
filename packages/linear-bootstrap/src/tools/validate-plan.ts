import { success, type ToolSuccess } from "@toolwright-adk/shared";
import type {
  Plan,
  GeneratePlanInput,
  ValidationIssue,
  PlanValidationResult,
  ValidatePlanInput,
} from "../types.js";

interface IssueWithPath {
  title: string;
  depends_on: string[];
  estimate?: number;
  path: string;
}

function collectAllIssues(plan: Plan): IssueWithPath[] {
  const result: IssueWithPath[] = [];
  for (let ei = 0; ei < plan.epics.length; ei++) {
    const epic = plan.epics[ei];
    for (let ii = 0; ii < epic.issues.length; ii++) {
      result.push({
        title: epic.issues[ii].title,
        depends_on: epic.issues[ii].depends_on,
        estimate: epic.issues[ii].estimate,
        path: `epics[${ei}].issues[${ii}]`,
      });
    }
  }
  return result;
}

function detectCycles(
  issues: IssueWithPath[],
  errors: ValidationIssue[],
): void {
  const graph = new Map<string, string[]>();
  for (const issue of issues) {
    graph.set(issue.title, issue.depends_on);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(title: string, chain: string[]): void {
    if (inStack.has(title)) {
      const cycleStart = chain.indexOf(title);
      const cycle = chain.slice(cycleStart).concat(title);
      errors.push({
        code: "CIRCULAR_DEPENDENCY",
        message: `Circular dependency: ${cycle.join(" -> ")}`,
      });
      return;
    }
    if (visited.has(title)) return;

    visited.add(title);
    inStack.add(title);

    for (const dep of graph.get(title) ?? []) {
      if (graph.has(dep)) {
        dfs(dep, [...chain, title]);
      }
    }

    inStack.delete(title);
  }

  for (const title of graph.keys()) {
    if (!visited.has(title)) {
      dfs(title, []);
    }
  }
}

function checkOrphanedDependencies(
  issues: IssueWithPath[],
  titleSet: Set<string>,
  errors: ValidationIssue[],
): void {
  for (const issue of issues) {
    for (const dep of issue.depends_on) {
      if (!titleSet.has(dep)) {
        errors.push({
          code: "ORPHANED_DEPENDENCY",
          message: `Issue "${issue.title}" depends on "${dep}" which does not exist`,
          path: issue.path,
        });
      }
    }
  }
}

function checkUndefinedMilestones(
  epics: Plan["epics"],
  milestoneNames: Set<string>,
  errors: ValidationIssue[],
): void {
  for (let i = 0; i < epics.length; i++) {
    const epic = epics[i];
    if (!milestoneNames.has(epic.milestone)) {
      errors.push({
        code: "UNDEFINED_MILESTONE",
        message: `Epic "${epic.title}" references undefined milestone "${epic.milestone}"`,
        path: `epics[${i}]`,
      });
    }
  }
}

function checkEpicSizes(
  epics: Plan["epics"],
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
): void {
  for (let i = 0; i < epics.length; i++) {
    const epic = epics[i];
    if (epic.issues.length === 0) {
      errors.push({
        code: "EMPTY_EPIC",
        message: `Epic "${epic.title}" has no issues`,
        path: `epics[${i}]`,
      });
    }
    if (epic.issues.length > 12) {
      warnings.push({
        code: "LARGE_EPIC",
        message: `Epic "${epic.title}" has ${epic.issues.length} issues (recommended: 12 or fewer)`,
        path: `epics[${i}]`,
      });
    }
  }
}

function checkEstimates(
  issues: IssueWithPath[],
  warnings: ValidationIssue[],
): void {
  for (const issue of issues) {
    if (issue.estimate !== undefined && issue.estimate > 5) {
      warnings.push({
        code: "HIGH_ESTIMATE",
        message: `Issue "${issue.title}" has estimate ${issue.estimate} (consider breaking down issues >5 points)`,
        path: issue.path,
      });
    }
  }
}

function checkInfrastructureEpic(
  epics: Plan["epics"],
  warnings: ValidationIssue[],
): void {
  const hasInfra = epics.some((e) =>
    e.title.toLowerCase().includes("infra"),
  );
  if (!hasInfra) {
    warnings.push({
      code: "NO_INFRASTRUCTURE_EPIC",
      message:
        "include_infrastructure preference is set but no epic with 'infra' in title was found",
    });
  }
}

function checkDuplicateTitles(
  issues: IssueWithPath[],
  errors: ValidationIssue[],
): void {
  const seen = new Map<string, string>();
  for (const issue of issues) {
    const existing = seen.get(issue.title);
    if (existing) {
      errors.push({
        code: "DUPLICATE_TITLE",
        message: `Duplicate issue title "${issue.title}" at ${existing} and ${issue.path}`,
        path: issue.path,
      });
    } else {
      seen.set(issue.title, issue.path);
    }
  }
}

function checkEmptyDescriptions(
  epics: Plan["epics"],
  warnings: ValidationIssue[],
): void {
  for (let i = 0; i < epics.length; i++) {
    if (epics[i].description.trim() === "") {
      warnings.push({
        code: "EMPTY_DESCRIPTION",
        message: `Epic "${epics[i].title}" has an empty description`,
        path: `epics[${i}]`,
      });
    }
  }
}

export function validatePlan(
  plan: Plan,
  preferences?: GeneratePlanInput["preferences"],
): PlanValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const allIssues = collectAllIssues(plan);
  const titleSet = new Set(allIssues.map((i) => i.title));
  const milestoneNames = new Set(plan.milestones.map((m) => m.name));

  detectCycles(allIssues, errors);
  checkOrphanedDependencies(allIssues, titleSet, errors);
  checkUndefinedMilestones(plan.epics, milestoneNames, errors);
  checkEpicSizes(plan.epics, errors, warnings);
  checkEstimates(allIssues, warnings);
  checkDuplicateTitles(allIssues, errors);
  checkEmptyDescriptions(plan.epics, warnings);

  if (preferences?.include_infrastructure) {
    checkInfrastructureEpic(plan.epics, warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validatePlanTool(
  args: ValidatePlanInput,
): ToolSuccess<PlanValidationResult> {
  const result = validatePlan(args.plan, args.preferences);
  return success(result);
}
