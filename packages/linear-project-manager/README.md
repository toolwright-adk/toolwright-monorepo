# linear-project-manager

Claude Code plugin that teaches agents to use [`linear-bootstrap`](../linear-bootstrap) and the official Linear MCP together — preventing the anti-pattern of creating issues one-by-one when batch tools are available.

## The Problem

When agents have access to both `linear-bootstrap` (batch project creation) and the official Linear MCP (individual CRUD), they default to the familiar tool. This leads to creating 12 issues sequentially with `save_issue` instead of one `add-epic` call that produces proper hierarchy.

## What This Plugin Does

Encodes tool selection heuristics as skills, agents, and commands:

| Component                | Purpose                                                    |
| ------------------------ | ---------------------------------------------------------- |
| `/linear`                | Router — dispatches to the right skill based on intent     |
| `/linear-check`          | Probes both MCP servers and reports health status          |
| `linear-planner` agent   | Decides: `add-epic` vs `save_issue` vs `bootstrap-project` |
| `linear-ops` agent       | Day-to-day: triage, status updates, cycle management       |
| `linear-bootstrap` skill | Full project creation workflow with prerequisite checks    |
| `linear-expand` skill    | Add epics to existing projects                             |
| `linear-status` skill    | Project health reports                                     |

## Install

### Via marketplace

Add the marketplace to your Claude Code settings:

```
/plugin marketplace add github:toolwright-adk/toolwright-monorepo
```

Then enable the plugin in your project `.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "linear-project-manager@toolwright-adk": true
  }
}
```

### Local testing

```bash
claude --plugin-dir /path/to/toolwright-monorepo/packages/linear-project-manager
```

## Prerequisites

The plugin itself has no runtime dependencies — it's all markdown. But the skills expect two MCP servers:

1. **linear-bootstrap** — batch project creation ([setup guide](../linear-bootstrap/README.md))
2. **Official Linear MCP** — individual issue CRUD (enable in Claude Code settings)

Run `/linear-check` to verify both are available.

## Cross-Platform Portability

The tool selection rules work beyond Claude Code. See [`portability/`](portability/) for ready-to-use snippets:

| Platform          | File                                                           |
| ----------------- | -------------------------------------------------------------- |
| Cursor / Windsurf | [`cursorrules-snippet.md`](portability/cursorrules-snippet.md) |
| Codex / Continue  | [`AGENTS.md`](portability/AGENTS.md)                           |
| Roo Code / Cline  | [`clinerules-snippet.md`](portability/clinerules-snippet.md)   |

The `linear-bootstrap` MCP tool descriptions also include `RECOMMENDED` usage guidance that works in any MCP-capable environment without additional configuration.

## License

[MIT](../../LICENSE)
