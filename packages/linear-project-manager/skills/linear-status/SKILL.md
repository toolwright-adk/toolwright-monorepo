---
name: linear-status
description: |
  Check project health and generate status updates for Linear projects. Use when the user asks
  about project progress, wants a status report, asks "how's the project going", wants to
  know what's blocked, or needs to post a status update to Linear.
argument-hint: "[project name or ID]"
allowed-tools: mcp__linear-bootstrap__introspect-workspace, mcp__linear__get_project, mcp__linear__list_issues, mcp__linear__get_milestone, mcp__linear__list_milestones, mcp__linear__get_status_updates, mcp__linear__save_status_update, mcp__linear__list_cycles
license: MIT
metadata:
  author: toolwright-adk
  version: "0.1.0"
compatibility: Requires both the linear-bootstrap MCP server and the official Linear MCP (first-party Claude integration).
---

# Linear Project Status

Check project health and optionally post a status update to Linear.

## Workflow

### 0. Verify prerequisites

Confirm both MCP tool sets are available:

- `mcp__linear__get_project` (official Linear MCP)
- `mcp__linear-bootstrap__introspect-workspace` (linear-bootstrap MCP)

If the official Linear MCP is missing, you can still provide a limited report using linear-bootstrap's `introspect-workspace`. If linear-bootstrap is missing, you can still read project state — you just won't have team convention context.

Tell the user which tools are available and proceed with what you have.

### 1. Find the project

Use the project name or ID from `$ARGUMENTS`. If not provided, use `mcp__linear__list_projects` to show available projects and ask which one.

### 2. Gather project state

In parallel where possible:

- `mcp__linear__get_project` — project overview, dates, status
- `mcp__linear__list_issues` filtered by project — all issues with their statuses
- `mcp__linear__list_milestones` — milestone progress
- `mcp__linear-bootstrap__introspect-workspace` — team conventions (workflow states, cycle info)

### 3. Synthesize the report

Present a structured summary:

**Progress:**

- Overall completion (done issues / total issues)
- Per-milestone breakdown with % complete
- Current cycle progress (if cycles enabled)

**Health indicators:**

- Blocked issues (issues with unresolved dependencies)
- Stale issues (in-progress but no recent activity)
- High-priority unassigned issues
- Overdue milestones

**Recent activity:**

- Issues completed recently
- Issues moved to in-progress

### 4. Offer to post a status update

Ask: _"Want me to post this as a status update to Linear?"_

If yes, use `mcp__linear__save_status_update` with a concise version of the report.

## Examples

```
User: /linear-status Checkout Redesign

Agent: ## Checkout Redesign — Status

       **Progress:** 62% complete (31/50 issues done)
       - ✅ M1: Payment Integration — 100% (8/8)
       - 🔄 M2: Cart Overhaul — 75% (9/12)
       - 🔄 M3: Checkout Flow — 47% (14/30)

       **Health:**
       - 2 blocked issues in M3 (waiting on API team)
       - 1 high-priority unassigned: "Handle failed payment retry"
       - M2 target date is tomorrow — 3 issues remaining

       Want me to post this as a status update to Linear?
```
