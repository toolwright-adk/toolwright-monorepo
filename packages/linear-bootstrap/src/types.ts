import { z } from "zod";

export const IssueSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  estimate: z.number().optional(),
  labels: z.array(z.string()),
  priority: z.number().min(1).max(4),
  depends_on: z.array(z.string()),
});

export const EpicSchema = z.object({
  title: z.string(),
  description: z.string(),
  milestone: z.string(),
  issues: z.array(IssueSchema),
});

export const MilestoneSchema = z.object({
  name: z.string(),
  description: z.string(),
  target_date: z.string().optional(),
  sort_order: z.number(),
});

export const PlanSchema = z.object({
  project: z.object({
    name: z.string(),
    description: z.string(),
    target_date: z.string().optional(),
  }),
  milestones: z.array(MilestoneSchema),
  epics: z.array(EpicSchema),
});

export const PlanSummarySchema = z.object({
  total_issues: z.number(),
  total_epics: z.number(),
  total_milestones: z.number(),
  estimated_points: z.number(),
});

export const GeneratePlanInputSchema = z.object({
  description: z.string(),
  team_id: z.string(),
  complexity: z.enum(["small", "medium", "large"]).default("medium"),
  preferences: z
    .object({
      milestone_style: z
        .enum(["time-based", "deliverable-based", "hybrid"])
        .optional(),
      issue_detail_level: z
        .enum(["titles-only", "with-descriptions", "full-acceptance-criteria"])
        .optional(),
      include_infrastructure: z.boolean().optional(),
      include_docs: z.boolean().optional(),
    })
    .optional(),
});

// --- Validation result types ---

export const ValidationIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
  path: z.string().optional(),
});

export const PlanValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(ValidationIssueSchema),
  warnings: z.array(ValidationIssueSchema),
});

// --- Tool input schemas ---

export const ValidatePlanInputSchema = z.object({
  plan: PlanSchema.optional(),
  plan_id: z.string().optional(),
  preferences: GeneratePlanInputSchema.shape.preferences,
});

export const BootstrapProjectInputSchema = z.object({
  plan: PlanSchema.optional(),
  plan_id: z.string().optional(),
  team_id: z.string(),
  dry_run: z.boolean().default(false),
});

export const GenerateAndBootstrapInputSchema = GeneratePlanInputSchema.extend({
  dry_run: z.boolean().default(false),
});

export const BootstrapResultSchema = z.object({
  project_id: z.string(),
  milestone_ids: z.record(z.string(), z.string()),
  label_ids: z.record(z.string(), z.string()),
  epic_ids: z.record(z.string(), z.string()),
  issue_ids: z.record(z.string(), z.string()),
  dependency_count: z.number(),
});

export const AddEpicInputSchema = z.object({
  project_id: z.string(),
  team_id: z.string(),
  epic: EpicSchema,
  milestone_id: z.string().optional(),
  label_ids: z.record(z.string(), z.string()).optional(),
});

export const AddEpicResultSchema = z.object({
  epic_id: z.string(),
  issue_ids: z.record(z.string(), z.string()),
});

// --- Inferred types ---

export type Issue = z.infer<typeof IssueSchema>;
export type Epic = z.infer<typeof EpicSchema>;
export type Milestone = z.infer<typeof MilestoneSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type PlanSummary = z.infer<typeof PlanSummarySchema>;
export type GeneratePlanInput = z.infer<typeof GeneratePlanInputSchema>;
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;
export type PlanValidationResult = z.infer<typeof PlanValidationResultSchema>;
export type ValidatePlanInput = z.infer<typeof ValidatePlanInputSchema>;
export type BootstrapProjectInput = z.infer<typeof BootstrapProjectInputSchema>;
export type GenerateAndBootstrapInput = z.infer<
  typeof GenerateAndBootstrapInputSchema
>;
export type BootstrapResult = z.infer<typeof BootstrapResultSchema>;
export type AddEpicInput = z.infer<typeof AddEpicInputSchema>;
export type AddEpicResult = z.infer<typeof AddEpicResultSchema>;
