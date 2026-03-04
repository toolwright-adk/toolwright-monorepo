import { type Logger, type ToolSuccess, success } from "@toolwright-adk/shared";
import { LinearApiClient } from "../linear/client.js";
import type { TeamInfo } from "../types.js";

export async function listTeams(
  _args: Record<string, never>,
  logger: Logger,
): Promise<ToolSuccess<TeamInfo[]>> {
  const client = new LinearApiClient(logger);
  const teams = await client.listTeams();
  logger.info({ count: teams.length }, "Listed teams");
  return success(teams);
}
