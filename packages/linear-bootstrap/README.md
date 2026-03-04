# @toolwright-adk/linear-bootstrap

MCP server for bootstrapping Linear projects from natural language descriptions. Generates structured plans, validates them, and creates complete project hierarchies in Linear with milestones, epics, issues, labels, and dependency relations.

## Tools

### generate-plan

Generate a structured project plan from a description. Returns a `plan_id` (cached server-side for 30 minutes) and summary statistics. The full plan is not returned to keep context lean — use `plan_id` with other tools.

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

**Returns:** `{ plan_id, summary }` — plan reference + statistics (total issues, epics, milestones, estimated points)

### validate-plan

Validate a project plan for structural issues. Pure logic, no external calls.

**Input:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `plan_id` | string | one required | Plan ID from generate-plan |
| `plan` | Plan | one required | Or inline plan object |
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
| `plan_id` | string | one required | Plan ID from generate-plan |
| `plan` | Plan | one required | Or inline plan object |
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

### generate-and-bootstrap

Compound tool that generates a plan, validates it, and bootstraps it in Linear in a single call. Eliminates the plan echo that wastes context when using generate-plan + bootstrap-project separately.

**Input:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | yes | Natural language project description |
| `team_id` | string | yes | Linear team ID |
| `complexity` | `"small" \| "medium" \| "large"` | no | Scale hint (default: `"medium"`) |
| `preferences` | object | no | Same as generate-plan |
| `dry_run` | boolean | no | Generate + validate only (default: `false`) |

**Returns:** `{ plan_id, summary, validation, bootstrap? }` — plan reference, stats, validation result, and bootstrap result (when not dry_run and validation passes)

## Required Environment Variables

| Variable | Required By | Description |
|----------|-------------|-------------|
| `LLM_API_KEY` | generate-plan, generate-and-bootstrap | OpenRouter API key |
| `LINEAR_API_KEY` | bootstrap-project, add-epic, generate-and-bootstrap | Linear API key |
| `LLM_MODEL` | generate-plan (optional) | Override LLM model (default: `anthropic/claude-sonnet-4`) |

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

## Context Efficiency

The server uses **server-side plan caching** to minimize context window pollution. When an agent calls `generate-plan`, the full plan is stored in memory and only a `plan_id` + summary is returned (~100 tokens vs ~3000+ for the full plan). Subsequent calls to `validate-plan` or `bootstrap-project` reference the plan by `plan_id`, avoiding the need to echo the entire plan object back through the agent's context.

For the simplest workflow, use `generate-and-bootstrap` — a single tool call that handles everything internally, returning only the final result.
