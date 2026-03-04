import {
  type Logger,
  type ToolSuccess,
  success,
} from "@toolwright-adk/shared";
import { LinearApiClient } from "../linear/client.js";
import {
  storeWorkspaceContext,
  retrieveWorkspaceContext,
} from "../workspace-cache.js";
import type {
  IntrospectWorkspaceInput,
  WorkspaceContext,
} from "../types.js";

export async function introspectWorkspaceCore(
  args: IntrospectWorkspaceInput,
  logger: Logger,
): Promise<{ context: WorkspaceContext }> {
  const cached = retrieveWorkspaceContext(args.team_id);
  if (cached) {
    logger.info(
      { team_id: args.team_id },
      "Using cached workspace context",
    );
    return { context: cached };
  }

  const client = new LinearApiClient(logger);

  logger.info(
    { team_id: args.team_id },
    "Introspecting workspace from Linear",
  );

  // Fetch team info first (need cyclesEnabled for conditional fetch)
  const teamInfo = await client.getTeamInfo(args.team_id);

  // Fetch remaining data (can conceptually be parallel but SDK is sequential)
  const [workflowStates, labels, defaultState, projects] = await Promise.all([
    client.getTeamWorkflowStates(args.team_id),
    client.getTeamLabels(args.team_id),
    client.getTeamDefaultState(args.team_id),
    client.getTeamProjects(args.team_id),
  ]);

  // Only fetch cycle if enabled
  const activeCycle = teamInfo.cyclesEnabled
    ? await client.getTeamActiveCycle(args.team_id)
    : undefined;

  const context: WorkspaceContext = {
    team_name: teamInfo.name,
    workflow_states: workflowStates,
    default_state_id: defaultState?.id,
    default_state_name: defaultState?.name,
    labels,
    custom_fields: [], // Not available in Linear SDK v37
    cycles_enabled: teamInfo.cyclesEnabled,
    active_cycle: activeCycle,
    existing_projects: projects,
  };

  storeWorkspaceContext(args.team_id, context);

  logger.info(
    {
      team: teamInfo.name,
      states: workflowStates.length,
      labels: labels.length,
      projects: projects.length,
      cyclesEnabled: teamInfo.cyclesEnabled,
    },
    "Workspace introspection complete",
  );

  return { context };
}

export async function introspectWorkspace(
  args: IntrospectWorkspaceInput,
  logger: Logger,
): Promise<ToolSuccess<WorkspaceContext>> {
  const { context } = await introspectWorkspaceCore(args, logger);
  return success(context);
}
