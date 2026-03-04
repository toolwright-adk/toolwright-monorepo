# @toolwright-adk/linear-bootstrap

MCP server for bootstrapping Linear projects from natural language descriptions. Generates structured plans, validates them, and creates complete project hierarchies in Linear with milestones, epics, issues, labels, and dependency relations.

## Tools

### generate-plan

Generate a structured project plan from a description. Returns milestones, epics, and issues without creating anything in Linear.

**Input:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | yes | Natural language project description |
| `team_id` | string | yes | Linear team ID |
| `complexity` | `"small" \| "medium" \| "large"` | no | Scale hint (default: `"medium"`) |
| `preferences.milestone_style` | `"time-based" \| "deliverable-based" \| "hybrid"` | no | Milestone naming style |
| `preferences.issue_detail_level` | `"titles-only" \| "with-descriptions" \| "full-acceptance-criteria"` | no | Issue detail level |
| `preferences.include_infrastructure` | boolean | no | Include infra/DevOps epic |
| `preferences.include_docs` | boolean | no | Include documentation epic |

**Returns:** `{ plan, summary }` — full plan object + statistics (total issues, epics, milestones, estimated points)

### validate-plan

Validate a project plan for structural issues. Pure logic, no external calls.

**Input:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `plan` | Plan | yes | Plan object to validate |
| `preferences` | object | no | Same preferences as generate-plan |

**Returns:** `{ valid, errors, warnings }` — boolean validity + arrays of `{ code, message, path? }`

**Validation checks:**

| Code | Severity | Description |
|------|----------|-------------|
| `CIRCULAR_DEPENDENCY` | error | Cycle in depends_on graph |
| `ORPHANED_DEPENDENCY` | error | depends_on references non-existent title |
| `UNDEFINED_MILESTONE` | error | Epic references missing milestone |
| `EMPTY_EPIC` | error | Epic with 0 issues |
| `DUPLICATE_TITLE` | error | Same issue title appears twice |
| `LARGE_EPIC` | warning | Epic with >12 issues |
| `HIGH_ESTIMATE` | warning | Issue estimate >5 points |
| `NO_INFRASTRUCTURE_EPIC` | warning | include_infrastructure set but no infra epic |
| `EMPTY_DESCRIPTION` | warning | Epic has empty description |

### bootstrap-project

Create a complete Linear project from a plan. Creates project, milestones, labels, epics (as parent issues), child issues, and dependency relations.

**Input:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `plan` | Plan | yes | Validated plan object |
| `team_id` | string | yes | Linear team ID |
| `dry_run` | boolean | no | Validate only, don't create (default: `false`) |

**Returns:** `{ project_id, milestone_ids, label_ids, epic_ids, issue_ids, dependency_count }` — maps of name/title to Linear ID for all created resources

**Behavior:**
- Validates plan before execution; returns validation errors as data if invalid
- Checks for existing project with same name (idempotency)
- Creates resources in order: project, milestones, labels, epics, issues, dependencies
- Tracks completed/failed arrays; throws `PartialExecutionError` on mid-batch failures
- Label and dependency creation failures are non-critical (logged, skipped)

### add-epic

Add a single epic with its child issues to an existing Linear project.

**Input:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_id` | string | yes | Existing Linear project ID |
| `team_id` | string | yes | Linear team ID |
| `epic` | Epic | yes | Epic object with issues |
| `milestone_id` | string | no | Milestone to wire epic to |
| `label_ids` | Record<string, string> | no | Label name-to-ID mapping |

**Returns:** `{ epic_id, issue_ids }` — created epic ID + map of issue titles to IDs

## Required Environment Variables

| Variable | Required By | Description |
|----------|-------------|-------------|
| `LLM_API_KEY` | generate-plan | OpenRouter API key |
| `LINEAR_API_KEY` | bootstrap-project, add-epic | Linear API key |
| `LLM_MODEL` | generate-plan (optional) | Override LLM model (default: `anthropic/claude-sonnet-4`) |

## Usage

```bash
# Build
pnpm build

# Run via stdio (for MCP client integration)
LLM_API_KEY=... LINEAR_API_KEY=... pnpm start

# Run tests
pnpm test
```
