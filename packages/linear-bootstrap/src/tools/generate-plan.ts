import OpenAI from "openai";
import {
  type Logger,
  type ToolSuccess,
  success,
  ExternalServiceError,
  PlanValidationError,
  withTiming,
} from "@toolwright-adk/shared";
import {
  PlanSchema,
  type GeneratePlanInput,
  type Plan,
  type PlanSummary,
} from "../types.js";

const DEFAULT_MODEL = "anthropic/claude-sonnet-4-20250514";

function buildSystemPrompt(args: GeneratePlanInput): string {
  const { complexity, preferences } = args;

  const scaleGuide = {
    small: "1-2 milestones, 3-5 epics, 10-25 issues",
    medium: "2-4 milestones, 5-10 epics, 20-60 issues",
    large: "4-6 milestones, 10-20 epics, 50-120 issues",
  }[complexity];

  const detailLevel = preferences?.issue_detail_level ?? "with-descriptions";

  let prompt = `You are a project planning expert. Generate a structured project plan as JSON.

## Scale
Target: ${scaleGuide}

## Structure Rules
- Milestones represent major phases or delivery targets. Each has a unique name, description, and sort_order (starting at 0).
- Epics are coherent deliverables, NOT categories. Each epic references a milestone by name and contains 3-10 issues.
- Issues use imperative titles (e.g. "Add authentication middleware", NOT "Authentication").
- Priority: 1=urgent, 2=high, 3=medium, 4=low. Most issues should be 2-3.
- Labels: use short lowercase kebab-case (e.g. "backend", "frontend", "api", "database", "testing").
- depends_on: only list real blockers, referencing other issue titles exactly. Most issues have no dependencies.
- Estimates are in story points (1, 2, 3, 5, 8). Omit if unsure.`;

  if (detailLevel === "full-acceptance-criteria") {
    prompt += `\n- Every issue MUST have a description with acceptance criteria as a markdown checklist.`;
  } else if (detailLevel === "with-descriptions") {
    prompt += `\n- Issues should have brief descriptions explaining what needs to be done.`;
  } else {
    prompt += `\n- Issue descriptions are optional. Focus on clear, self-explanatory titles.`;
  }

  if (preferences?.milestone_style === "time-based") {
    prompt += `\n- Milestones should represent time-based phases (e.g. "Week 1-2", "Sprint 1").`;
  } else if (preferences?.milestone_style === "deliverable-based") {
    prompt += `\n- Milestones should represent deliverable-based goals (e.g. "MVP", "Beta Launch").`;
  }

  if (preferences?.include_infrastructure) {
    prompt += `\n- Include an infrastructure/DevOps epic covering CI/CD, deployment, monitoring, etc.`;
  }

  if (preferences?.include_docs) {
    prompt += `\n- Include a documentation epic covering API docs, user guides, README, etc.`;
  }

  prompt += `

## Output Format
Return ONLY valid JSON matching this schema — no markdown fences, no explanation, no extra text:
{
  "project": { "name": string, "description": string, "target_date"?: string },
  "milestones": [{ "name": string, "description": string, "target_date"?: string, "sort_order": number }],
  "epics": [{
    "title": string, "description": string, "milestone": string,
    "issues": [{
      "title": string, "description"?: string, "estimate"?: number,
      "labels": string[], "priority": number (1-4), "depends_on": string[]
    }]
  }]
}`;

  return prompt;
}

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

export async function generatePlan(
  args: GeneratePlanInput,
  logger: Logger,
): Promise<ToolSuccess<{ plan: Plan; summary: PlanSummary }>> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new ExternalServiceError(
      "LLM_API_KEY environment variable is required",
      "openrouter",
    );
  }

  const model = process.env.LLM_MODEL ?? DEFAULT_MODEL;

  const client = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });

  const systemPrompt = buildSystemPrompt(args);

  logger.info(
    { complexity: args.complexity, model },
    "Generating project plan via OpenRouter",
  );

  let responseText: string;

  try {
    const { result: completion } = await withTiming(
      "openrouter-generate-plan",
      () =>
        client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: args.description },
          ],
          temperature: 0.7,
        }),
    );

    responseText = completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    throw new ExternalServiceError(
      "OpenRouter API call failed",
      "openrouter",
      {
        model,
        error: err instanceof Error ? err.message : String(err),
      },
    );
  }

  if (!responseText) {
    throw new PlanValidationError("Model returned empty response", {
      model,
    });
  }

  let rawPlan: unknown;
  try {
    rawPlan = JSON.parse(responseText);
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

  return success({ plan, summary });
}
