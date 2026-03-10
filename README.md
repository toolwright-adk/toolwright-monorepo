# Toolwright ADK

Agent Development Kit for production MCP servers and companion Skills. Orchestration-first tools that ship with workflow knowledge, not just API connectivity.

## Packages

| Package                                                               | Version                                                                                                                                       | Description                                                        |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [`@toolwright-adk/shared`](packages/shared)                           | [![npm](https://img.shields.io/npm/v/@toolwright-adk/shared)](https://www.npmjs.com/package/@toolwright-adk/shared)                           | Validation, errors, logging, output formatting, and test utilities |
| [`@toolwright-adk/linear-bootstrap`](packages/linear-bootstrap)       | [![npm](https://img.shields.io/npm/v/@toolwright-adk/linear-bootstrap)](https://www.npmjs.com/package/@toolwright-adk/linear-bootstrap)       | MCP server for bootstrapping Linear projects from natural language |
| [`linear-project-manager`](packages/linear-project-manager)           | Plugin                                                                                                                                        | Claude Code plugin — skills, agents, and commands for Linear       |
| [`@toolwright-adk/claude-code-plugins`](packages/claude-code-plugins) | [![npm](https://img.shields.io/npm/v/@toolwright-adk/claude-code-plugins)](https://www.npmjs.com/package/@toolwright-adk/claude-code-plugins) | Plugin registry with manifests and standalone skills               |

## Quick Start

```bash
git clone https://github.com/toolwright-adk/toolwright-monorepo.git
cd toolwright-monorepo
pnpm install
pnpm build
pnpm test
```

To use the Linear Bootstrap MCP server without cloning, see the [linear-bootstrap README](packages/linear-bootstrap/README.md).

## Monorepo Structure

```
toolwright-monorepo/
├── .claude-plugin/
│   └── marketplace.json        # Plugin marketplace for distribution
├── packages/
│   ├── shared/                 # @toolwright-adk/shared
│   ├── linear-bootstrap/       # @toolwright-adk/linear-bootstrap (MCP server)
│   ├── linear-project-manager/ # Claude Code plugin (skills + agents + commands)
│   └── claude-code-plugins/    # Plugin registry and standalone skills
├── templates/                  # Scaffolding for new packages
│   ├── mcp-server/
│   ├── apify-actor/
│   └── skill/
└── docs/
    └── QUALITY-RUBRIC.md
```

## Development

```bash
pnpm build          # build all packages
pnpm test           # run all tests
pnpm lint           # ESLint
pnpm format:check   # Prettier check
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contributor guide.

## Standards

All MCP servers must meet the [Quality Rubric](docs/QUALITY-RUBRIC.md) before shipping.

## License

[MIT](LICENSE)
