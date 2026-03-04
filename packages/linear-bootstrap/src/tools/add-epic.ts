import {
  type Logger,
  type ToolSuccess,
  success,
  PartialExecutionError,
} from "@toolwright-adk/shared";
import { LinearApiClient } from "../linear/client.js";
import type { AddEpicInput, AddEpicResult } from "../types.js";

export async function addEpic(
  args: AddEpicInput,
  logger: Logger,
): Promise<ToolSuccess<AddEpicResult>> {
  const { project_id, team_id, epic, milestone_id, label_ids } = args;
  const client = new LinearApiClient(logger);

  const completed: string[] = [];
  const failed: string[] = [];
  const issueIds: Record<string, string> = {};

  try {
    // Create epic as parent issue
    const epicIssue = await client.createIssue({
      teamId: team_id,
      title: epic.title,
      description: epic.description,
      projectId: project_id,
      projectMilestoneId: milestone_id,
    });
    completed.push(`epic:${epicIssue.id}`);

    // Create child issues
    for (const issue of epic.issues) {
      try {
        const issueLabelIds = label_ids
          ? issue.labels.map((l) => label_ids[l]).filter(Boolean)
          : [];

        const childIssue = await client.createIssue({
          teamId: team_id,
          title: issue.title,
          description: issue.description,
          priority: issue.priority,
          estimate: issue.estimate,
          projectId: project_id,
          projectMilestoneId: milestone_id,
          labelIds: issueLabelIds.length > 0 ? issueLabelIds : undefined,
          parentId: epicIssue.id,
        });
        issueIds[issue.title] = childIssue.id;
        completed.push(`issue:${childIssue.id}`);
      } catch (err) {
        failed.push(`issue:${issue.title}`);
        throw new PartialExecutionError(
          `Failed while creating issue "${issue.title}" in epic "${epic.title}"`,
          completed,
          failed,
          { error: err instanceof Error ? err.message : String(err) },
        );
      }
    }

    // Wire intra-epic dependencies (non-critical)
    for (const issue of epic.issues) {
      for (const depTitle of issue.depends_on) {
        const childId = issueIds[issue.title];
        const depId = issueIds[depTitle];
        if (childId && depId) {
          try {
            await client.setDependency(childId, depId);
          } catch (err) {
            logger.warn(
              { issueTitle: issue.title, depTitle, err },
              `Failed to set dependency in add-epic`,
            );
          }
        }
      }
    }

    const result: AddEpicResult = {
      epic_id: epicIssue.id,
      issue_ids: issueIds,
    };

    logger.info(
      { epicId: epicIssue.id, issueCount: Object.keys(issueIds).length },
      `Added epic "${epic.title}"`,
    );

    return success(result);
  } catch (err) {
    if (err instanceof PartialExecutionError) throw err;
    if (completed.length > 0) {
      throw new PartialExecutionError(
        `add-epic failed: ${err instanceof Error ? err.message : String(err)}`,
        completed,
        failed,
      );
    }
    throw err;
  }
}
