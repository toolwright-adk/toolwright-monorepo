---
name: linear-check
description: |
  Diagnose Linear MCP connectivity. Probes both linear-bootstrap and official Linear MCP
  servers and reports which tools are available, missing, or failing.
---

# Linear MCP Health Check

Probe both MCP servers and report status.

## Steps

### 1. Check linear-bootstrap MCP

Call `mcp__linear-bootstrap__list-teams`. Interpret the result:

- **Success** (returns team list): linear-bootstrap MCP is healthy. Note the teams.
- **Tool not found**: linear-bootstrap MCP server is not configured. The user needs to add it to `.mcp.json`.
- **Error response**: Server is configured but failing. Show the error. Common causes:
  - `LINEAR_API_KEY` missing or invalid
  - `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` not set (needed for plan generation)
  - Binary not found (check `which linear-bootstrap` or use absolute path)

### 2. Check official Linear MCP

Call `mcp__linear__list_teams`. Interpret the result:

- **Success**: Official Linear MCP is healthy.
- **Tool not found**: Official Linear MCP is not installed. The user needs to enable the Linear integration in Claude Code settings.
- **Error response**: Show the error.

### 3. Report

Present a summary:

```
## Linear MCP Status

| Server            | Status | Details              |
| ----------------- | ------ | -------------------- |
| linear-bootstrap  | ✅/❌  | [teams or error]     |
| official Linear   | ✅/❌  | [teams or error]     |
```

Then explain what's available:

- **Both healthy**: Full functionality — project creation, batch operations, status reports, individual issue management.
- **Only official Linear**: Can read/write individual issues, check status, manage cycles. Cannot create projects or add epics in batch.
- **Only linear-bootstrap**: Can create projects and batch operations. Cannot read existing issues, post status updates, or manage individual items.
- **Neither**: No Linear tools available. Guide the user to set up at least one.
