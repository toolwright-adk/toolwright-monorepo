---
name: linear-expand
description: |
  Add structured work (epics with child issues) to an existing Linear project. Use when the user
  wants to expand a project's scope, add an epic, add a batch of related issues to a project,
  or says something like "add these issues to the project" with 3 or more items.
argument-hint: "[description of work to add]"
allowed-tools: mcp__linear-bootstrap__introspect-workspace, mcp__linear-bootstrap__add-epic, mcp__linear__get_project, mcp__linear__list_issues, mcp__linear__list_milestones, mcp__linear__get_milestone
license: MIT
metadata:
  author: toolwright-adk
  version: "0.1.0"
compatibility: Requires both the linear-bootstrap MCP server and the official Linear MCP (first-party Claude integration).
---

# Expand a Linear Project

Add an epic with child issues to an existing project using `add-epic` — one call that gets parent/child structure, milestone wiring, and labels automatically.

## When to Use This vs. Other Tools

- **3+ related issues** that form a logical group → use this skill (`add-epic`)
- **1-2 standalone issues** → just use `mcp__linear__save_issue` directly
- **New project from scratch** → use `/linear-bootstrap` instead

## Workflow

### 0. Verify prerequisites

Confirm `mcp__linear-bootstrap__add-epic` is available. If not, tell the user the linear-bootstrap MCP server is not running and suggest troubleshooting.

### 1. Find the target project

Use `$ARGUMENTS` or ask the user which project to expand. Use `mcp__linear__list_projects` if needed.

### 2. Understand current project structure

Gather in parallel:

- `mcp__linear__get_project` — project overview
- `mcp__linear__list_milestones` — existing milestones (to wire the new epic to one)
- `mcp__linear__list_issues` — existing issues (to avoid duplicates and understand naming patterns)
- `mcp__linear-bootstrap__introspect-workspace` — team labels and workflow states (for label reuse)

### 3. Design the epic

From the user's description, determine:

- **Epic title and description**
- **Which milestone** to attach to (pick the most appropriate existing one)
- **Child issues** with titles, priorities, estimates, labels, and dependencies
- **Labels** to apply (reuse existing team labels where possible)

Show the user a summary: _"I'll add epic 'Payment Retry Logic' with 5 issues to milestone 'M3: Checkout Flow'. Sound right?"_

### 4. Create with add-epic

Use `mcp__linear-bootstrap__add-epic` with:

- `project_id` — from step 2
- `team_id` — from the project's team
- `epic` — the designed structure
- `milestone_id` — from step 2
- `label_ids` — map of label name → ID from introspection

Report what was created: epic ID, child issue count, milestone, labels applied.

### 5. Handle errors

If `add-epic` fails partially, report what was created vs. what failed. The successfully created items remain in Linear.

## Examples

```
User: /linear-expand Add payment retry handling to the Checkout Redesign project

Agent: Found project "Checkout Redesign" with 3 milestones.
       I'll add to M3: Checkout Flow.

       Epic: "Payment Retry Logic" (5 issues)
       - Detect failed payment attempts (P1)
       - Implement exponential backoff retry (P1)
       - Add retry status UI component (P2)
       - Send retry notification email (P3)
       - Add retry metrics dashboard (P3)

       Labels: "payments" (existing), "reliability" (existing)
       Sound right?

User: Yes, go ahead.

Agent: Created epic "Payment Retry Logic" in Checkout Redesign:
       - 5 child issues under M3: Checkout Flow
       - Reused 2 existing labels
```
