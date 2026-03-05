# @toolwright-adk/linear-bootstrap

MCP server for bootstrapping Linear projects from natural language descriptions. Generates structured plans, validates them, and creates complete project hierarchies in Linear with milestones, epics, issues, labels, and dependency relations.

## Workflow

The recommended sequence for bootstrapping a project:

```
list-teams → introspect-workspace → generate-plan → validate-plan → bootstrap-project
```

Or use the compound tool for a single call:

```
generate-and-bootstrap
```

Both paths auto-introspect the workspace when `LINEAR_API_KEY` is available, reusing cached context for 30 minutes.

## Tools

### list-teams

List all Linear teams accessible to the configured API key. Use this to discover `team_id` values for other tools.

**Input:** none

**Returns:** `[{ id, name, key }]` — array of accessible teams

### introspect-workspace

Read team conventions from Linear: workflow states, labels, cycles, existing projects. Returns cached context (30-min TTL). Called automatically by `generate-plan`, or use standalone to inspect team setup.

**Input:**

| Field     | Type   | Required | Description    |
| --------- | ------ | -------- | -------------- |
| `team_id` | string | yes      | Linear team ID |

**Returns:** `WorkspaceContext` — team name, workflow states, default state, labels (with parent groups), custom fields, cycle info, existing projects

### generate-plan

Generate a structured project plan from a description. Returns a `plan_id` (cached server-side for 30 minutes) and summary statistics. The full plan is not returned to keep context lean — use `plan_id` with other tools.

Auto-introspects the workspace when `LINEAR_API_KEY` is available, so generated plans respect existing labels, workflow states, and team conventions.

**Input:**

| Field                                | Type                                                                 | Required | Description                          |
| ------------------------------------ | -------------------------------------------------------------------- | -------- | ------------------------------------ |
| `description`                        | string                                                               | yes      | Natural language project description |
| `team_id`                            | string                                                               | yes      | Linear team ID                       |
| `complexity`                         | `"small" \| "medium" \| "large"`                                     | no       | Scale hint (default: `"medium"`)     |
| `project_type`                       | `"feature" \| "infrastructure" \| "api" \| "migration"`              | no       | Archetype (default: `"feature"`)     |
| `preferences.milestone_style`        | `"time-based" \| "deliverable-based" \| "hybrid"`                    | no       | Milestone naming style               |
| `preferences.issue_detail_level`     | `"titles-only" \| "with-descriptions" \| "full-acceptance-criteria"` | no       | Issue detail level                   |
| `preferences.include_infrastructure` | boolean                                                              | no       | Include infra/DevOps epic            |
| `preferences.include_docs`           | boolean                                                              | no       | Include documentation epic           |

**Returns:** `{ plan_id, summary }` — plan reference + statistics (total issues, epics, milestones, estimated points)

**Project Archetypes:**

| Type             | Example Milestones                                                | Example Epics                                      |
| ---------------- | ----------------------------------------------------------------- | -------------------------------------------------- |
| `feature`        | Spec & design, MVP behind feature flag, Public launch             | Backend APIs, Web UI, Analytics                    |
| `infrastructure` | Prototype, Dogfood for one service, Org-wide rollout              | Core infra changes, Service migrations, Monitoring |
| `api`            | API design sign-off, Backend implementation, General availability | Auth & rate limiting, Core endpoints, SDKs & DX    |
| `migration`      | Dual-write in place, Backfill completed, Cutover                  | Data modeling, Backfill jobs, Cutover runbook      |

### validate-plan

Validate a project plan for structural issues. Pure logic, no external calls.

**Input:**

| Field         | Type   | Required     | Description                       |
| ------------- | ------ | ------------ | --------------------------------- |
| `plan_id`     | string | one required | Plan ID from generate-plan        |
| `plan`        | Plan   | one required | Or inline plan object             |
| `preferences` | object | no           | Same preferences as generate-plan |

**Returns:** `{ valid, errors, warnings }` — boolean validity + arrays of `{ code, message, path? }`

**Validation checks:**

| Code                     | Severity | Description                                  |
| ------------------------ | -------- | -------------------------------------------- |
| `CIRCULAR_DEPENDENCY`    | error    | Cycle in depends_on graph                    |
| `ORPHANED_DEPENDENCY`    | error    | depends_on references non-existent title     |
| `UNDEFINED_MILESTONE`    | error    | Epic references missing milestone            |
| `EMPTY_EPIC`             | error    | Epic with 0 issues                           |
| `DUPLICATE_TITLE`        | error    | Same issue title appears twice               |
| `LARGE_EPIC`             | warning  | Epic with >12 issues                         |
| `HIGH_ESTIMATE`          | warning  | Issue estimate >5 points                     |
| `NO_INFRASTRUCTURE_EPIC` | warning  | include_infrastructure set but no infra epic |
| `EMPTY_DESCRIPTION`      | warning  | Epic has empty description                   |

### bootstrap-project

Create a complete Linear project from a plan. Creates project, milestones, labels, epics (as parent issues), child issues, and dependency relations.

**Input:**

| Field     | Type    | Required     | Description                                    |
| --------- | ------- | ------------ | ---------------------------------------------- |
| `plan_id` | string  | one required | Plan ID from generate-plan                     |
| `plan`    | Plan    | one required | Or inline plan object                          |
| `team_id` | string  | yes          | Linear team ID                                 |
| `dry_run` | boolean | no           | Validate only, don't create (default: `false`) |

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

| Field          | Type                   | Required | Description                |
| -------------- | ---------------------- | -------- | -------------------------- |
| `project_id`   | string                 | yes      | Existing Linear project ID |
| `team_id`      | string                 | yes      | Linear team ID             |
| `epic`         | Epic                   | yes      | Epic object with issues    |
| `milestone_id` | string                 | no       | Milestone to wire epic to  |
| `label_ids`    | Record<string, string> | no       | Label name-to-ID mapping   |

**Returns:** `{ epic_id, issue_ids }` — created epic ID + map of issue titles to IDs

### generate-and-bootstrap

Compound tool that generates a plan, validates it, and bootstraps it in Linear in a single call. Eliminates the plan echo that wastes context when using generate-plan + bootstrap-project separately.

**Input:**

| Field          | Type                                                    | Required | Description                                 |
| -------------- | ------------------------------------------------------- | -------- | ------------------------------------------- |
| `description`  | string                                                  | yes      | Natural language project description        |
| `team_id`      | string                                                  | yes      | Linear team ID                              |
| `complexity`   | `"small" \| "medium" \| "large"`                        | no       | Scale hint (default: `"medium"`)            |
| `project_type` | `"feature" \| "infrastructure" \| "api" \| "migration"` | no       | Archetype (default: `"feature"`)            |
| `preferences`  | object                                                  | no       | Same as generate-plan                       |
| `dry_run`      | boolean                                                 | no       | Generate + validate only (default: `false`) |

**Returns:** `{ plan_id, summary, validation, bootstrap? }` — plan reference, stats, validation result, and bootstrap result (when not dry_run and validation passes)

## Examples

### list-teams

**Input:**

```json
{}
```

**Output:**

```json
[
  { "id": "team-abc123", "name": "Engineering", "key": "ENG" },
  { "id": "team-def456", "name": "Design", "key": "DES" }
]
```

### introspect-workspace

**Input:**

```json
{ "team_id": "team-abc123" }
```

**Output:**

```json
{
  "team_name": "Engineering",
  "workflow_states": [
    { "id": "state-1", "name": "Backlog", "type": "backlog" },
    { "id": "state-2", "name": "In Progress", "type": "started" }
  ],
  "default_state_id": "state-1",
  "default_state_name": "Backlog",
  "labels": [{ "id": "label-1", "name": "backend" }],
  "custom_fields": [],
  "cycles_enabled": true,
  "active_cycle": {
    "id": "cycle-1",
    "name": "Cycle 12",
    "starts_at": "2026-03-01T00:00:00Z",
    "ends_at": "2026-03-14T00:00:00Z"
  },
  "existing_projects": [
    { "id": "proj-1", "name": "Auth Revamp", "state": "started" }
  ]
}
```

### generate-plan

**Input:**

```json
{
  "description": "Build a Slack integration for posting Linear updates",
  "team_id": "team-abc123",
  "complexity": "medium",
  "project_type": "feature"
}
```

**Output:**

```json
{
  "plan_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "summary": {
    "total_issues": 12,
    "total_epics": 3,
    "total_milestones": 2,
    "estimated_points": 34
  }
}
```

### validate-plan

**Input:**

```json
{ "plan_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }
```

**Output:**

```json
{
  "valid": true,
  "errors": [],
  "warnings": [
    {
      "code": "HIGH_ESTIMATE",
      "message": "Issue estimate 8 exceeds 5",
      "path": "epics[1].issues[2]"
    }
  ]
}
```

### bootstrap-project

**Input:**

```json
{
  "plan_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "team_id": "team-abc123"
}
```

**Output:**

```json
{
  "project_id": "proj-new789",
  "milestone_ids": { "MVP": "ms-001", "Launch": "ms-002" },
  "label_ids": { "backend": "label-1", "frontend": "label-2" },
  "epic_ids": { "Slack OAuth": "issue-100" },
  "issue_ids": {
    "Implement OAuth flow": "issue-101",
    "Store tokens": "issue-102"
  },
  "dependency_count": 3
}
```

### add-epic

**Input:**

```json
{
  "project_id": "proj-new789",
  "team_id": "team-abc123",
  "epic": {
    "title": "Monitoring",
    "description": "Add observability for the Slack integration",
    "milestone": "Launch",
    "issues": [
      {
        "title": "Add Datadog metrics",
        "labels": ["backend"],
        "priority": 2,
        "depends_on": []
      },
      {
        "title": "Create alert runbook",
        "labels": ["docs"],
        "priority": 3,
        "depends_on": ["Add Datadog metrics"]
      }
    ]
  },
  "milestone_id": "ms-002"
}
```

**Output:**

```json
{
  "epic_id": "issue-200",
  "issue_ids": {
    "Add Datadog metrics": "issue-201",
    "Create alert runbook": "issue-202"
  }
}
```

## Required Environment Variables

| Variable         | Required By                                         | Description                                               |
| ---------------- | --------------------------------------------------- | --------------------------------------------------------- |
| `LLM_API_KEY`    | generate-plan, generate-and-bootstrap               | OpenRouter API key                                        |
| `LINEAR_API_KEY` | bootstrap-project, add-epic, generate-and-bootstrap | Linear API key                                            |
| `LLM_MODEL`      | generate-plan (optional)                            | Override LLM model (default: `anthropic/claude-sonnet-4`) |

## MCP Client Configuration

### Claude Code

Add to your project's `.mcp.json` or `~/.claude.json`:

```json
{
  "mcpServers": {
    "linear-bootstrap": {
      "command": "node",
      "args": ["/path/to/packages/linear-bootstrap/dist/server.js"],
      "env": {
        "LLM_API_KEY": "sk-or-...",
        "LINEAR_API_KEY": "lin_api_..."
      }
    }
  }
}
```

### Cursor / Windsurf

Add to your MCP settings (typically `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "linear-bootstrap": {
      "command": "node",
      "args": ["/path/to/packages/linear-bootstrap/dist/server.js"],
      "env": {
        "LLM_API_KEY": "sk-or-...",
        "LINEAR_API_KEY": "lin_api_..."
      }
    }
  }
}
```

### Generic MCP Client (stdio)

The server communicates over stdin/stdout using the MCP protocol:

```bash
LLM_API_KEY=sk-or-... LINEAR_API_KEY=lin_api_... node dist/server.js
```

## Usage

```bash
# Build
pnpm build

# Run via stdio (for MCP client integration)
LLM_API_KEY=... LINEAR_API_KEY=... pnpm start

# Run tests
pnpm test
```

## Context-Aware Behavior

When `LINEAR_API_KEY` is available, `generate-plan` and `generate-and-bootstrap` automatically introspect the target team's workspace before generating a plan. This means:

- **Label reuse** — existing team labels are reused by exact name match; new labels are only created when no match exists
- **Workflow awareness** — triage states are respected (issues never bypass triage); the team's default state is applied to all created issues
- **Project collision avoidance** — the LLM is told about active projects to avoid naming conflicts
- **Cycle fit** — when cycles are enabled, the LLM is guided to keep issues sized for one cycle
- **Custom fields** — required custom fields are noted in the prompt (schema-ready; SDK v37 does not expose custom fields yet, so this array is always empty for now)

Workspace context is cached for 30 minutes per team. Call `introspect-workspace` directly to inspect or refresh.

## Context Efficiency

The server uses **server-side plan caching** to minimize context window pollution. When an agent calls `generate-plan`, the full plan is stored in memory and only a `plan_id` + summary is returned (~100 tokens vs ~3000+ for the full plan). Subsequent calls to `validate-plan` or `bootstrap-project` reference the plan by `plan_id`, avoiding the need to echo the entire plan object back through the agent's context.

For the simplest workflow, use `generate-and-bootstrap` — a single tool call that handles everything internally, returning only the final result.
