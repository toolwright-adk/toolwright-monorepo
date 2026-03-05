import OpenAI from "openai";
import {
  type Logger,
  type ToolSuccess,
  success,
  ExternalServiceError,
  PlanValidationError,
  withTiming,
  validateToolInput,
} from "@toolwright-adk/shared";
import {
  PlanSchema,
  GeneratePlanInputSchema,
  type GeneratePlanInput,
  type Plan,
  type PlanSummary,
  type WorkspaceContext,
} from "../types.js";
import { storePlan } from "../plan-cache.js";
import { retrieveWorkspaceContext } from "../workspace-cache.js";
import { introspectWorkspaceCore } from "./introspect-workspace.js";
import { buildSystemPrompt } from "../planning/prompts.js";

function computeSummary(plan: Plan): PlanSummary {
  let totalIssues = 0;
  let estimatedPoints = 0;

  for (const epic of plan.epics) {
    totalIssues += epic.issues.length;
    for (const issue of epic.issues) {
      estimatedPoints += issue.estimate ?? 0;
    }
  }

  return {
    total_issues: totalIssues,
    total_epics: plan.epics.length,
    total_milestones: plan.milestones.length,
    estimated_points: estimatedPoints,
  };
}

/** Core plan generation — returns raw plan + summary without caching */
export async function generatePlanCore(
  args: GeneratePlanInput,
  logger: Logger,
): Promise<{ plan: Plan; summary: PlanSummary }> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new ExternalServiceError(
      "LLM_API_KEY environment variable is required",
      "llm",
    );
  }

  const baseURL = process.env.LLM_BASE_URL;
  if (!baseURL) {
    throw new ExternalServiceError(
      "LLM_BASE_URL environment variable is required (e.g. https://openrouter.ai/api/v1)",
      "llm",
    );
  }

  const model = process.env.LLM_MODEL;
  if (!model) {
    throw new ExternalServiceError(
      "LLM_MODEL environment variable is required (e.g. anthropic/claude-sonnet-4)",
      "llm",
    );
  }

  // Auto-introspect workspace (non-blocking on failure)
  let workspaceContext: WorkspaceContext | undefined;
  try {
    workspaceContext = retrieveWorkspaceContext(args.team_id);
    if (!workspaceContext && process.env.LINEAR_API_KEY) {
      const { context } = await introspectWorkspaceCore(
        { team_id: args.team_id },
        logger,
      );
      workspaceContext = context;
    }
  } catch (err) {
    logger.warn(
      {
        team_id: args.team_id,
        error: err instanceof Error ? err.message : String(err),
      },
      "Workspace introspection failed, proceeding without context",
    );
  }

  const client = new OpenAI({
    apiKey,
    baseURL,
  });

  const systemPrompt = buildSystemPrompt(args, workspaceContext);

  logger.info(
    {
      complexity: args.complexity,
      project_type: args.project_type,
      model,
      hasWorkspaceContext: !!workspaceContext,
    },
    "Generating project plan via LLM API",
  );

  let responseText: string;

  try {
    const { result: completion } = await withTiming("llm-generate-plan", () =>
      client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.description },
        ],
        temperature: 0.3,
      }),
    );

    responseText = completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    throw new ExternalServiceError("LLM API call failed", "llm", {
      model,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  if (!responseText) {
    throw new PlanValidationError("Model returned empty response", {
      model,
    });
  }

  // Strip markdown code fences if present
  const cleaned = responseText
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  let rawPlan: unknown;
  try {
    rawPlan = JSON.parse(cleaned);
  } catch {
    throw new PlanValidationError("Model returned invalid JSON", {
      raw: responseText.slice(0, 500),
    });
  }

  const parseResult = PlanSchema.safeParse(rawPlan);
  if (!parseResult.success) {
    throw new PlanValidationError("Plan failed schema validation", {
      errors: parseResult.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
  }

  const plan = parseResult.data;
  const summary = computeSummary(plan);

  logger.info(
    {
      issues: summary.total_issues,
      epics: summary.total_epics,
      milestones: summary.total_milestones,
      points: summary.estimated_points,
    },
    "Plan generated successfully",
  );

  return { plan, summary };
}

/** MCP wrapper — stores plan in cache, returns plan_id + summary */
export async function generatePlan(
  args: GeneratePlanInput,
  logger: Logger,
): Promise<ToolSuccess<{ plan_id: string; summary: PlanSummary }>> {
  const validation = validateToolInput(GeneratePlanInputSchema, args);
  if (!validation.success) throw validation.error;

  const { plan, summary } = await generatePlanCore(args, logger);
  const planId = storePlan(plan);
  return success({ plan_id: planId, summary });
}
