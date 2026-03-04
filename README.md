# Toolwright ADK

Agent Development Kit for production MCP servers and companion Skills. Orchestration-first tools for the Apify marketplace.

## Monorepo Structure

```
toolwright-monorepo/
├── packages/           # Published packages
│   └── shared/         # @toolwright-adk/shared — validation, errors, output, testing
├── templates/          # Scaffolding for new packages
│   ├── mcp-server/     # Apify Actor + MCP server template
│   └── skill/          # Agent Skill template
└── docs/               # Project documentation
    └── QUALITY-RUBRIC.md
```

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| `@toolwright-adk/shared` | Shared validation, error handling, output formatting, and test utilities | Active |
| `@toolwright-adk/linear-bootstrap` | Linear project bootstrapping MCP server | Planned |

## Getting Started

```bash
pnpm install
pnpm build
pnpm test
```

## Standards

All MCP servers must meet the [Quality Rubric](docs/QUALITY-RUBRIC.md) before shipping.

## License

[MIT](LICENSE)
