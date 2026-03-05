import type {
  GeneratePlanInput,
  ProjectType,
  WorkspaceContext,
} from "../types.js";

interface Archetype {
  description: string;
  milestones: string[];
  epics: string[];
  notes: string;
}

export const ARCHETYPES: Record<ProjectType, Archetype> = {
  feature: {
    description: "SaaS user-facing feature",
    milestones: [
      "Spec & design",
      "MVP behind feature flag",
      "Public launch",
      "Post-launch polish",
    ],
    epics: [
      "Backend APIs",
      "Web UI",
      "Analytics/experimentation",
      "Rollout & migration",
    ],
    notes:
      "Issues should focus on: API endpoints, UI components, tracking events, QA, and docs.",
  },
  infrastructure: {
    description: "Internal platform or infrastructure",
    milestones: [
      "Prototype",
      "Dogfood for one service",
      "Org-wide rollout",
      "Legacy decommissioned",
    ],
    epics: [
      "Core infra changes",
      "Service migrations",
      "Monitoring & alerts",
      "Developer tooling",
    ],
    notes:
      "Emphasize dependencies and cross-team coordination. More issues around migration guides, runbooks, and observability.",
  },
  api: {
    description: "API development project",
    milestones: [
      "API design sign-off",
      "Backend implementation",
      "Client SDKs & docs",
      "Pilot integrators live",
      "General availability",
    ],
    epics: [
      "Design & review",
      "Auth & rate limiting",
      "Core endpoints",
      "SDKs & DX",
      "Monitoring/SLAs",
    ],
    notes:
      "Issues should include: schema changes, endpoint implementation, error handling, docs, and example apps.",
  },
  migration: {
    description: "Data or system migration",
    milestones: [
      "Inventory & plan",
      "Dual-write in place",
      "Backfill completed",
      "Cutover",
      "Decommission legacy",
    ],
    epics: [
      "Data modeling & tooling",
      "Backfill jobs",
      "Dual-write/sync",
      "Validation & rollback",
      "Cutover runbook",
    ],
    notes:
      "Dependencies matter most here — ordering is critical. Backfill before cutover, validation before decommission. Every issue should have clear rollback criteria.",
  },
};

export function getArchetype(type: ProjectType): Archetype {
  return ARCHETYPES[type];
}

export function buildWorkspaceContextSection(ctx: WorkspaceContext): string {
  let section = `\n\n## Team Context (from Linear workspace "${ctx.team_name}")`;

  if (ctx.labels.length > 0) {
    const labelNames = ctx.labels.map((l) => l.name);
    section += `\n\n### Existing Labels
The team already has these labels: ${labelNames.map((n) => `"${n}"`).join(", ")}.
IMPORTANT: Reuse existing label names exactly (case-sensitive) rather than inventing new ones. Only create new labels if no existing label fits.`;
  }

  const triageState = ctx.workflow_states.find((s) => s.type === "triage");
  if (triageState) {
    section += `\n\n### Triage
This team uses triage (state: "${triageState.name}"). Never set issues to bypass triage — new issues should enter the default workflow state.`;
  }

  if (ctx.default_state_name) {
    section += `\nDefault issue state: "${ctx.default_state_name}".`;
  }

  const requiredFields = ctx.custom_fields.filter((f) => f.required);
  if (requiredFields.length > 0) {
    section += `\n\n### Required Custom Fields
These custom fields are required: ${requiredFields.map((f) => `"${f.name}"`).join(", ")}.
Note these in issue descriptions so they can be filled in manually.`;
  }

  if (ctx.existing_projects.length > 0) {
    const activeProjects = ctx.existing_projects.filter(
      (p) => !["completed", "canceled"].includes(p.state.toLowerCase()),
    );
    if (activeProjects.length > 0) {
      section += `\n\n### Existing Projects
Avoid naming collisions with these active projects: ${activeProjects.map((p) => `"${p.name}"`).join(", ")}.`;
    }
  }

  if (ctx.cycles_enabled && ctx.active_cycle) {
    section += `\n\n### Cycles
Team uses cycles. Current cycle: "${ctx.active_cycle.name}" (${ctx.active_cycle.starts_at} to ${ctx.active_cycle.ends_at}). Issues should be sized to fit within a single cycle.`;
  }

  return section;
}

export function buildSystemPrompt(
  args: GeneratePlanInput,
  workspaceContext?: WorkspaceContext,
): string {
  const { complexity, project_type, preferences } = args;
  const archetype = getArchetype(project_type);

  const scaleGuide = {
    small: "1-2 milestones, 3-5 epics, 10-25 issues",
    medium: "2-4 milestones, 5-10 epics, 20-60 issues",
    large: "4-6 milestones, 10-20 epics, 50-120 issues",
  }[complexity];

  const detailLevel = preferences?.issue_detail_level ?? "with-descriptions";

  let prompt = `You are a project planning expert. Generate a structured project plan as JSON.

## General Rules
- Project name should describe the OUTCOME, not the work ("Improve trial conversion" not "Pricing page revamp").
- Epics are coherent deliverables a small team can own, NOT categories.
- Every issue should be completable within one cycle (1-2 weeks).
- Only set depends_on where ordering is genuinely critical — not every parent/child relationship needs a dependency.
- Do NOT generate boilerplate issues like "Set up project", "Kickoff meeting", or "Final review" — every issue should map to a real code change or deliverable.
- Err on the side of fewer, better objects: 3-6 milestones, 3-8 epics.
- Do NOT set target_date on milestones or the project unless the user explicitly provides a deadline — dates go stale immediately and erode trust.
- Only include estimates when the user opts in via preferences.

## Scale
Target: ${scaleGuide}

## Project Type: ${project_type}
${archetype.description}.

Suggested milestone phases: ${archetype.milestones.map((m) => `"${m}"`).join(", ")}.
Suggested epic patterns: ${archetype.epics.map((e) => `"${e}"`).join(", ")}.
${archetype.notes}

Use these as guidance — adapt to the specific project description. Don't force every suggested milestone or epic if it doesn't fit.

## Structure Rules
- Milestones represent major phases or delivery targets. Each has a unique name, description, and sort_order (starting at 0).
- Issues use imperative titles (e.g. "Add authentication middleware", NOT "Authentication").
- Priority: 1=urgent, 2=high, 3=medium, 4=low. Most issues should be 2-3.
- Labels: use short lowercase kebab-case (e.g. "backend", "frontend", "api", "database", "testing").
- depends_on: only list real blockers, referencing other issue titles exactly. Most issues have no dependencies.`;

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

  if (workspaceContext) {
    prompt += buildWorkspaceContextSection(workspaceContext);
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
