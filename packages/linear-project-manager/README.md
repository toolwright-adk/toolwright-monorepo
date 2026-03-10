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

1. Add the marketplace:

```bash
claude plugin marketplace add toolwright-adk/toolwright-monorepo
```

2. Open `/plugin` in Claude Code, go to the **Marketplaces** tab, select **toolwright-adk**, and install **linear-project-manager**.

If you ran step 1 from within an active Claude Code session, you may need to restart before the marketplace appears in `/plugin`.

### Local testing

```bash
claude --plugin-dir /path/to/toolwright-monorepo/packages/linear-project-manager
```

## Prerequisites

The plugin itself has no runtime dependencies — it's all markdown. But the skills expect two MCP servers:

1. **linear-bootstrap** — batch project creation ([setup guide](../linear-bootstrap/README.md))
2. **Official Linear MCP** — individual issue CRUD (enable in Claude Code settings)

Run `/linear-check` to verify both are available.

## Cross-Platform Support

### Cursor

This plugin includes a `.cursor-plugin/plugin.json` manifest. Cursor uses the same directory conventions (`skills/`, `agents/`, `commands/`) and the same SKILL.md frontmatter format. The plugin is structurally ready for the [Cursor Marketplace](https://cursor.com/marketplace).

### Other Platforms

See [`portability/`](portability/) for ready-to-use snippets:

| Platform          | File                                                           |
| ----------------- | -------------------------------------------------------------- |
| Cursor / Windsurf | [`cursorrules-snippet.md`](portability/cursorrules-snippet.md) |
| Roo Code / Cline  | [`clinerules-snippet.md`](portability/clinerules-snippet.md)   |
| Codex / Continue  | [`AGENTS.md`](portability/AGENTS.md)                           |

The skills in `skills/` are also directly compatible with [Roo Code's skill system](https://docs.roocode.com/features/skills) — copy them to `.roo/skills/` or `.agents/skills/`.

The `linear-bootstrap` MCP tool descriptions include `RECOMMENDED` usage guidance that works in any MCP-capable environment without additional configuration.

## License

[MIT](../../LICENSE)
