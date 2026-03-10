# Cross-Platform Plugin Distribution

Research notes on distributing the linear-project-manager plugin beyond Claude Code.
Updated 2026-03-10.

---

## Platform Comparison

| Feature | Claude Code | Cursor | Roo Code | Windsurf |
|---------|-------------|--------|----------|----------|
| Plugin manifest | `.claude-plugin/plugin.json` | `.cursor-plugin/plugin.json` | N/A (skill folders) | N/A (rules files) |
| Skill format | `skills/{name}/SKILL.md` | `skills/{name}/SKILL.md` | `.roo/skills/{name}/SKILL.md` | N/A |
| Agent format | `agents/{name}.md` | `agents/{name}.md` | N/A (modes instead) | N/A |
| Command format | `commands/{name}.md` | `commands/{name}.md` | Slash commands | N/A |
| MCP config | `.mcp.json` or inline | `.mcp.json` or inline | MCP settings | MCP settings |
| Hook system | `hooks/hooks.json` | `hooks/hooks.json` | N/A | N/A |
| Marketplace | Yes (marketplace.json) | Yes (Cursor Marketplace) | VS Code Marketplace | Windsurf Plugin Store |
| Distribution | git-subdir, npm, github | Git repo submission | Community sharing | Rules Directory |

## Current Coverage

### Claude Code (full plugin)
- `.claude-plugin/plugin.json` manifest
- 3 skills, 2 agents, 2 commands
- marketplace.json with git-subdir source
- Status: **shipping**

### Cursor (plugin manifest ready)
- `.cursor-plugin/plugin.json` manifest added
- Same directory structure: `skills/`, `agents/`, `commands/`
- Schema is nearly identical to Claude Code's
- Skills and agents use same markdown + frontmatter format
- MCP config identical (`.mcp.json` or inline `mcpServers`)
- Status: **manifest ready, needs marketplace submission**
- Ref: https://cursor.com/docs/plugins/building

### Roo Code (skills portable)
- `.roo/skills/{name}/SKILL.md` uses same frontmatter format (name, description)
- Our skills work as-is when placed in `.roo/skills/` or `.agents/skills/`
- Mode-specific skills via `skills-{mode}/` directories (e.g., `skills-code/`)
- No plugin manifest — users copy skill folders manually or via community sharing
- `clinerules-snippet.md` provides lightweight alternative
- Status: **skills portable, no submission mechanism**
- Ref: https://docs.roocode.com/features/skills

### Windsurf (rules only)
- `.windsurfrules` or `.windsurf/rules/` files
- 6000 char limit per rule file, 12000 total
- `cursorrules-snippet.md` content works in `.windsurfrules`
- No plugin system — rules + MCP only
- Status: **snippet ready**
- Ref: https://docs.windsurf.com

### Codex / Continue (AGENTS.md)
- `portability/AGENTS.md` provides tool selection guidance
- CLI fallback commands for environments without MCP
- Status: **ready**

## Key Insight

All platforms are converging on the same three-tier pattern:
1. **MCP tools** (universal protocol) — works everywhere
2. **Skills** (markdown + frontmatter) — Claude Code and Cursor use identical format; Roo Code is compatible
3. **Agents/orchestration** (platform-specific) — only Claude Code and Cursor support this natively

The MCP server is the universal foundation. Skills are nearly portable. Agents are the differentiation layer.

## Porting Priority

1. **Cursor Marketplace** — highest leverage. Manifest ready, same format. Submit after merge.
2. **Roo Code community** — medium. Skills work as-is. Share on GitHub Discussions / Discord.
3. **Windsurf Rules Directory** — low. Snippet already works. Submit as a rulebook.
4. **LangChain/LangGraph** — separate effort. Wrapping MCP tools as LangChain toolset nodes. Not a plugin concern.

## MCP Statelessness Transition (June 2026)

The MCP spec is moving to stateless-first (removing mandatory initialization handshake).
This affects our distribution model:

- **Serverless hosting**: linear-bootstrap could run on Lambda/Workers/Cloud Functions
- **Horizontal scaling**: standard load balancer, no sticky sessions needed
- **Our plan caching**: currently in-memory, process-local. For stateless deployment,
  need to either use `generate-and-bootstrap` (single request) or externalize the cache
  (Redis, DynamoDB, etc.)
- **Timeline**: tentatively June 2026 spec release
- **Action**: no code changes needed now. The HTTP transport (`linear-bootstrap-http`)
  already supports stateless requests via `generate-and-bootstrap`. Plan caching is an
  optimization, not a requirement.

Refs:
- https://blog.modelcontextprotocol.io/posts/2025-12-19-mcp-transport-future/
- https://github.com/modelcontextprotocol/specification/issues/1442
- https://modelcontextprotocol.io/development/roadmap

## Sources

- [Cursor Plugin Docs](https://cursor.com/docs/plugins/building)
- [Cursor Marketplace](https://cursor.com/marketplace)
- [Roo Code Skills](https://docs.roocode.com/features/skills)
- [Windsurf Cascade](https://windsurf.com/cascade)
- [MCP Transport Future](https://blog.modelcontextprotocol.io/posts/2025-12-19-mcp-transport-future/)
