# Linear Project Management — Tool Selection Guide

> From the linear-project-manager plugin (toolwright-adk).
> For use with Codex, Continue, and other agents that read AGENTS.md.

## MCP Tools Available

If you have the `linear-bootstrap` MCP server configured, you have access to
batch project creation tools. If you also have the official Linear MCP, you
have full CRUD on individual items.

## Critical Rule: Batch vs Individual Issue Creation

**Never create 3 or more related issues individually.** Use batch tools instead.

| Scenario                               | Correct approach                      | Wrong approach                                            |
| -------------------------------------- | ------------------------------------- | --------------------------------------------------------- |
| New project with milestones and issues | `generate-plan` → `bootstrap-project` | Creating project, then milestones, then issues one-by-one |
| Adding 3+ related issues to a project  | `add-epic` (one call, gets hierarchy) | Calling `save_issue` in a loop                            |
| 1-2 standalone issues                  | `save_issue` directly                 | Overkill to use `add-epic`                                |

## Workflow

Before creating any issues or projects:

1. Call `introspect-workspace` to learn team labels, workflow states, and conventions
2. Check if a similar project already exists (avoid duplicates)
3. Choose the right tool based on the table above

## If MCP is unavailable

Fall back to CLI:

```bash
# Create a project interactively
npx @toolwright-adk/linear-bootstrap

# Or programmatically
npx @toolwright-adk/linear-bootstrap --team ENG --description "your project description"
```
