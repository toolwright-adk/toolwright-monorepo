import {
  type Logger,
  type ToolSuccess,
  success,
  validateToolInput,
} from "@toolwright-adk/shared";
import { LinearApiClient } from "../linear/client.js";
import { ListTeamsInputSchema, type TeamInfo } from "../types.js";

export async function listTeams(
  _args: Record<string, never>,
  logger: Logger,
): Promise<ToolSuccess<TeamInfo[]>> {
  const validation = validateToolInput(ListTeamsInputSchema, _args);
  if (!validation.success) throw validation.error;

  const client = new LinearApiClient(logger);
  const teams = await client.listTeams();
  logger.info({ count: teams.length }, "Listed teams");
  return success(teams);
}
