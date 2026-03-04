import {
  type Logger,
  type ToolSuccess,
  success,
  PartialExecutionError,
} from "@toolwright-adk/shared";
import { LinearApiClient } from "../linear/client.js";
import { validatePlan } from "./validate-plan.js";
import type {
  BootstrapProjectInput,
  BootstrapResult,
  PlanValidationResult,
  Plan,
} from "../types.js";

function collectUniqueLabels(plan: Plan): string[] {
  const labels = new Set<string>();
  for (const epic of plan.epics) {
    for (const issue of epic.issues) {
      for (const label of issue.labels) {
        labels.add(label);
      }
    }
  }
  return [...labels].sort();
}

export async function bootstrapProject(
  args: BootstrapProjectInput,
  logger: Logger,
): Promise<ToolSuccess<BootstrapResult | PlanValidationResult>> {
  const { plan, team_id, dry_run } = args;

  if (dry_run) {
    const validationResult = validatePlan(plan);
    return success(validationResult);
  }

  const validation = validatePlan(plan);
  if (!validation.valid) {
    return success(validation);
  }

  const client = new LinearApiClient(logger);

  const completed: string[] = [];
  const failed: string[] = [];

  const milestoneIds: Record<string, string> = {};
  const labelIds: Record<string, string> = {};
  const epicIds: Record<string, string> = {};
  const issueIds: Record<string, string> = {};

  try {
    // Idempotency check
    const existing = await client.getProjectByName(plan.project.name);
    if (existing) {
      logger.warn(
        { projectId: existing.id, name: plan.project.name },
        "Project already exists, aborting to prevent duplicates",
      );
      return success(
        {
          project_id: existing.id,
          milestone_ids: {},
          label_ids: {},
          epic_ids: {},
          issue_ids: {},
          dependency_count: 0,
        } satisfies BootstrapResult,
        `Project "${plan.project.name}" already exists (id: ${existing.id}). No changes made.`,
      );
    }

    // Create project
    const project = await client.createProject({
      name: plan.project.name,
      teamIds: [team_id],
      description: plan.project.description,
      targetDate: plan.project.target_date,
    });
    completed.push(`project:${project.id}`);

    // Create milestones (critical — throw on failure)
    for (const ms of plan.milestones) {
      try {
        const milestone = await client.createMilestone({
          name: ms.name,
          projectId: project.id,
          description: ms.description,
          targetDate: ms.target_date,
          sortOrder: ms.sort_order,
        });
        milestoneIds[ms.name] = milestone.id;
        completed.push(`milestone:${milestone.id}`);
      } catch (err) {
        failed.push(`milestone:${ms.name}`);
        throw err;
      }
    }

    // Create labels (non-critical — log warning on failure)
    const uniqueLabels = collectUniqueLabels(plan);
    for (const labelName of uniqueLabels) {
      try {
        const label = await client.createLabel({
          name: labelName,
          teamId: team_id,
        });
        labelIds[labelName] = label.id;
        completed.push(`label:${label.id}`);
      } catch (err) {
        logger.warn(
          { labelName, err },
          `Failed to create label "${labelName}", skipping`,
        );
        failed.push(`label:${labelName}`);
      }
    }

    // Create epics as parent issues + child issues
    for (const epic of plan.epics) {
      const milestoneId = milestoneIds[epic.milestone];

      try {
        const epicIssue = await client.createIssue({
          teamId: team_id,
          title: epic.title,
          description: epic.description,
          projectId: project.id,
          projectMilestoneId: milestoneId,
        });
        epicIds[epic.title] = epicIssue.id;
        issueIds[epic.title] = epicIssue.id;
        completed.push(`epic:${epicIssue.id}`);

        for (const issue of epic.issues) {
          try {
            const issueLabelIds = issue.labels
              .map((l) => labelIds[l])
              .filter(Boolean);

            const childIssue = await client.createIssue({
              teamId: team_id,
              title: issue.title,
              description: issue.description,
              priority: issue.priority,
              estimate: issue.estimate,
              projectId: project.id,
              projectMilestoneId: milestoneId,
              labelIds:
                issueLabelIds.length > 0 ? issueLabelIds : undefined,
              parentId: epicIssue.id,
            });
            issueIds[issue.title] = childIssue.id;
            completed.push(`issue:${childIssue.id}`);
          } catch (err) {
            failed.push(`issue:${issue.title}`);
            throw err;
          }
        }
      } catch (err) {
        if (err instanceof PartialExecutionError) throw err;
        if (completed.length > 0) {
          throw new PartialExecutionError(
            `Bootstrap failed while creating issues for epic "${epic.title}"`,
            completed,
            failed,
            { error: err instanceof Error ? err.message : String(err) },
          );
        }
        throw err;
      }
    }

    // Wire dependencies (non-critical)
    let dependencyCount = 0;
    for (const epic of plan.epics) {
      for (const issue of epic.issues) {
        for (const depTitle of issue.depends_on) {
          const childId = issueIds[issue.title];
          const depId = issueIds[depTitle];
          if (childId && depId) {
            try {
              await client.setDependency(childId, depId);
              dependencyCount++;
              completed.push(`dependency:${depId}->${childId}`);
            } catch (err) {
              logger.warn(
                { issueTitle: issue.title, depTitle, err },
                `Failed to set dependency "${depTitle}" -> "${issue.title}"`,
              );
              failed.push(`dependency:${depTitle}->${issue.title}`);
            }
          }
        }
      }
    }

    const result: BootstrapResult = {
      project_id: project.id,
      milestone_ids: milestoneIds,
      label_ids: labelIds,
      epic_ids: epicIds,
      issue_ids: issueIds,
      dependency_count: dependencyCount,
    };

    logger.info(
      {
        projectId: project.id,
        milestones: Object.keys(milestoneIds).length,
        labels: Object.keys(labelIds).length,
        epics: Object.keys(epicIds).length,
        issues: Object.keys(issueIds).length,
        dependencies: dependencyCount,
        failedCount: failed.length,
      },
      "Bootstrap completed",
    );

    return success(result);
  } catch (err) {
    if (err instanceof PartialExecutionError) throw err;
    if (completed.length > 0) {
      throw new PartialExecutionError(
        `Bootstrap failed: ${err instanceof Error ? err.message : String(err)}`,
        completed,
        failed,
      );
    }
    throw err;
  }
}
