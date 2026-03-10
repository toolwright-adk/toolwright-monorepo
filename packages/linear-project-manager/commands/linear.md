---
name: linear
description: |
  Quick entrypoint for Linear project management. Routes to the appropriate skill or agent
  based on intent: create projects, check status, expand scope, or manage issues.
argument-hint: "[action] [details]"
---

# Linear Project Manager

Route the user's request to the appropriate workflow.

## Pre-flight

Before routing, do a quick availability check: attempt `mcp__linear-bootstrap__list-teams` and `mcp__linear__list_teams`. If either fails, warn the user which MCP is unavailable and what functionality is limited. Suggest `/linear-check` for full diagnostics. Continue with whatever is available.

## Routing

Based on `$ARGUMENTS` or the user's intent:

| Intent                                           | Action                                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Create a new project, plan, or bootstrap         | Invoke the `linear-bootstrap` skill with the description                            |
| Check project status, health, progress           | Invoke the `linear-status` skill with the project name                              |
| Add an epic or batch of issues to a project      | Invoke the `linear-expand` skill with the details                                   |
| Single issue operations (create, update, triage) | Handle directly using official Linear MCP tools (`save_issue`, `list_issues`, etc.) |
| Check MCP health or diagnose setup               | Invoke `/linear-check`                                                              |
| Unclear                                          | Ask the user what they want to do with Linear                                       |

## Examples

- `/linear create a project for auth migration` → routes to `/linear-bootstrap`
- `/linear status Checkout Redesign` → routes to `/linear-status`
- `/linear add retry handling to the payments project` → routes to `/linear-expand`
- `/linear assign ENG-456 to Sarah` → uses `linear-ops` agent
- `/linear check` → routes to `/linear-check`
