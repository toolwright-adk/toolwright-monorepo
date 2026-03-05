import { z } from "zod";

export const IssueSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  // Linear uses 0 (none) through 4; we require a priority for generated plans
  estimate: z.number().int().min(0).optional(),
  labels: z.array(z.string()).default([]),
  priority: z.number().min(1).max(4),
  depends_on: z.array(z.string()).default([]),
});

export const EpicSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  milestone: z.string().min(1),
  issues: z.array(IssueSchema),
});

// ISO date pattern: YYYY-MM-DD
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const MilestoneSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  target_date: z
    .string()
    .regex(isoDatePattern, "Must be YYYY-MM-DD format")
    .optional(),
  sort_order: z.number(),
});

export const PlanSchema = z.object({
  project: z.object({
    name: z.string().min(1),
    description: z.string(),
    target_date: z
      .string()
      .regex(isoDatePattern, "Must be YYYY-MM-DD format")
      .optional(),
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

export const ProjectTypeEnum = z.enum([
  "feature",
  "infrastructure",
  "api",
  "migration",
]);

export const GeneratePlanInputSchema = z.object({
  description: z.string().min(1).max(10000),
  team_id: z.string().min(1),
  complexity: z.enum(["small", "medium", "large"]).default("medium"),
  project_type: ProjectTypeEnum.default("feature"),
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

export const ValidatePlanInputObject = z.object({
  plan: PlanSchema.optional(),
  plan_id: z.string().min(1).optional(),
  preferences: GeneratePlanInputSchema.shape.preferences,
  complexity: z.enum(["small", "medium", "large"]).optional(),
});
export const ValidatePlanInputSchema = ValidatePlanInputObject.refine(
  (data) => data.plan !== undefined || data.plan_id !== undefined,
  { message: "Either plan or plan_id is required" },
);

export const BootstrapProjectInputObject = z.object({
  plan: PlanSchema.optional(),
  plan_id: z.string().min(1).optional(),
  team_id: z.string().min(1),
  dry_run: z.boolean().default(false),
});
export const BootstrapProjectInputSchema = BootstrapProjectInputObject.refine(
  (data) => data.plan !== undefined || data.plan_id !== undefined,
  { message: "Either plan or plan_id is required" },
);

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
  project_id: z.string().min(1),
  team_id: z.string().min(1),
  epic: EpicSchema,
  milestone_id: z.string().optional(),
  label_ids: z.record(z.string(), z.string()).optional(),
});

export const AddEpicResultSchema = z.object({
  epic_id: z.string(),
  issue_ids: z.record(z.string(), z.string()),
});

// --- Workspace introspection schemas ---

export const WorkflowStateInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
});

export const LabelInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  parent_name: z.string().optional(),
});

export const CustomFieldInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  required: z.boolean(),
});

export const ActiveCycleSchema = z.object({
  id: z.string(),
  name: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
});

export const WorkspaceContextSchema = z.object({
  team_name: z.string(),
  workflow_states: z.array(WorkflowStateInfoSchema),
  default_state_id: z.string().optional(),
  default_state_name: z.string().optional(),
  labels: z.array(LabelInfoSchema),
  custom_fields: z.array(CustomFieldInfoSchema),
  cycles_enabled: z.boolean(),
  active_cycle: ActiveCycleSchema.optional(),
  existing_projects: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      state: z.string(),
    }),
  ),
});

export const IntrospectWorkspaceInputSchema = z.object({
  team_id: z.string().min(1),
});

export const ListTeamsInputSchema = z.object({});

export const TeamInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
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
export type ProjectType = z.infer<typeof ProjectTypeEnum>;
export type WorkflowStateInfo = z.infer<typeof WorkflowStateInfoSchema>;
export type LabelInfo = z.infer<typeof LabelInfoSchema>;
export type CustomFieldInfo = z.infer<typeof CustomFieldInfoSchema>;
export type ActiveCycle = z.infer<typeof ActiveCycleSchema>;
export type WorkspaceContext = z.infer<typeof WorkspaceContextSchema>;
export type IntrospectWorkspaceInput = z.infer<
  typeof IntrospectWorkspaceInputSchema
>;
export type ListTeamsInput = z.infer<typeof ListTeamsInputSchema>;
export type TeamInfo = z.infer<typeof TeamInfoSchema>;
