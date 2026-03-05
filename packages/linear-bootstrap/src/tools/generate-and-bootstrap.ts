import {
  type Logger,
  type ToolSuccess,
  success,
  validateToolInput,
} from "@toolwright-adk/shared";
import { generatePlanCore } from "./generate-plan.js";
import { validatePlan } from "./validate-plan.js";
import { bootstrapProject } from "./bootstrap-project.js";
import { storePlan } from "../plan-cache.js";
import {
  GenerateAndBootstrapInputSchema,
  type GenerateAndBootstrapInput,
  type PlanSummary,
  type PlanValidationResult,
  type BootstrapResult,
} from "../types.js";

interface GenerateAndBootstrapResult {
  plan_id: string;
  summary: PlanSummary;
  validation: PlanValidationResult;
  bootstrap?: BootstrapResult;
}

export async function generateAndBootstrap(
  args: GenerateAndBootstrapInput,
  logger: Logger,
): Promise<ToolSuccess<GenerateAndBootstrapResult>> {
  const inputValidation = validateToolInput(
    GenerateAndBootstrapInputSchema,
    args,
  );
  if (!inputValidation.success) throw inputValidation.error;

  // Step 1: Generate plan
  const { plan, summary } = await generatePlanCore(args, logger);
  const planId = storePlan(plan);

  // Step 2: Validate
  const validation = validatePlan(plan, args.preferences);

  if (!validation.valid || args.dry_run) {
    return success({ plan_id: planId, summary, validation });
  }

  // Step 3: Bootstrap
  const bootstrapResult = await bootstrapProject(
    { plan, team_id: args.team_id, dry_run: false },
    logger,
  );
  const bootstrapData = bootstrapResult._meta!.data;
  const bootstrap =
    "project_id" in bootstrapData
      ? (bootstrapData as BootstrapResult)
      : undefined;

  return success({ plan_id: planId, summary, validation, bootstrap });
}
