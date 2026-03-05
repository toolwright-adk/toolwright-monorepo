---
name: linear-bootstrap
description: |
  Create a complete Linear project from a natural-language description. Use this skill when the user
  wants to plan a project, set up a project in Linear, scaffold project milestones and issues,
  bootstrap a project plan, or create a structured project from a description. Also use when the
  user mentions creating epics, milestones, or issue hierarchies in Linear.
license: MIT
metadata:
  author: toolwright-adk
  version: "0.1.0"
compatibility: Requires the linear-bootstrap MCP server with LINEAR_API_KEY, LLM_API_KEY, LLM_BASE_URL, and LLM_MODEL configured.
---

# Bootstrap a Linear Project

Create a fully structured Linear project — milestones, epics, issues, labels, and dependency chains — from a plain-English description.

## Workflow

### 1. Identify the team

List the available Linear teams. If there is only one, use it. If there are multiple, ask the user which team to target.

The server automatically reads your team's existing labels, workflow states, and active projects before generating a plan. No extra step needed.

### 2. Gather the project description

Use the description from `$ARGUMENTS` if provided. Otherwise, ask the user what project they want to create.

Determine the **project type** from the description:

- **feature** — new user-facing functionality (default if unclear)
- **infrastructure** — internal tooling, platform work, DevOps
- **api** — public or internal API development
- **migration** — moving between systems, data migrations

Determine the **complexity**:

- **small** — a focused effort, 1-2 milestones, a few epics
- **medium** — a typical project, 2-4 milestones (default if unclear)
- **large** — a major initiative, 4-6 milestones, many epics

### 3. Generate and review the plan

Generate a project plan using the description, team, project type, and complexity. You will receive a plan reference and a summary with counts of milestones, epics, issues, and estimated points.

Show the user the summary. Ask: _"Does this look right, or should I adjust the scope?"_

### 4. Validate the plan

Validate the plan for structural issues (circular dependencies, orphaned references, etc.). If there are errors, report them and stop. If there are only warnings, show them and ask whether to proceed.

### 5. Create in Linear

Create the project in Linear using the plan reference and team. Report what was created:

- Project name and ID
- Number of milestones, epics, issues, and dependencies
- How many labels were reused vs. created new

### One-shot mode

If the user says "just do it," "don't ask," or otherwise indicates they want unattended creation, generate the plan and create the project in a single step without intermediate review.

## Examples

### Interactive

```
User: /linear-bootstrap CLI tool for managing database migrations

Agent: Found team "Engineering" (ENG). I'll generate a feature project plan...

       Plan ready: 3 milestones, 4 epics, 14 issues, ~28 points.
       Does this look right, or should I adjust the scope?

User: Looks good, go ahead.

Agent: Created "Database Migration CLI" in Linear:
       - 3 milestones, 4 epics, 14 issues, 8 dependencies
       - Reused 5 existing labels, created 2 new ones
```

### One-shot

```
User: /linear-bootstrap just do it — webhook subscriptions API

Agent: Created "Webhook Subscriptions API" in Linear:
       - 4 milestones (API design → GA), 5 epics, 18 issues
       - 12 dependencies, 6 labels reused
```

### Infrastructure project

```
User: /linear-bootstrap shared logging library for the monorepo, infrastructure type

Agent: Found team "Platform" (PLT). Generating an infrastructure project plan...

       Plan ready: 2 milestones (Core library ready → Org-wide adoption),
       4 epics, 14 issues.
       Proceed?
```
