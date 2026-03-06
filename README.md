# Toolwright ADK

Agent Development Kit for production MCP servers and companion Skills. Orchestration-first tools that ship with workflow knowledge, not just API connectivity.

## Packages

| Package                                                         | Version                                                                                                                                 | Description                                                        |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [`@toolwright-adk/shared`](packages/shared)                     | [![npm](https://img.shields.io/npm/v/@toolwright-adk/shared)](https://www.npmjs.com/package/@toolwright-adk/shared)                     | Validation, errors, logging, output formatting, and test utilities |
| [`@toolwright-adk/linear-bootstrap`](packages/linear-bootstrap) | [![npm](https://img.shields.io/npm/v/@toolwright-adk/linear-bootstrap)](https://www.npmjs.com/package/@toolwright-adk/linear-bootstrap) | MCP server for bootstrapping Linear projects from natural language |

## Quick Start

```bash
git clone https://github.com/toolwright-adk/toolwright-monorepo.git
cd toolwright-monorepo
pnpm install
pnpm build
pnpm test
```

To use the Linear Bootstrap MCP server without cloning, see the [linear-bootstrap README](packages/linear-bootstrap).

## Monorepo Structure

```
toolwright-monorepo/
├── packages/
│   ├── shared/             # @toolwright-adk/shared
│   └── linear-bootstrap/   # @toolwright-adk/linear-bootstrap
├── templates/              # Scaffolding for new packages
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
