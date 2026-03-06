# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2026-03-06

### Added

- `@toolwright-adk/linear-bootstrap` — `mcpName` field for MCP Registry verification
- `server.json` for MCP Registry publishing
- Apify actor listing README, OpenAPI schema, and simplified input (LINEAR_API_KEY only)
- Demo GIF and screenshot in docs and READMEs

### Changed

- SKILL.md version bumped to 0.1.2
- Fixed model reference in generate-plan error message (claude-sonnet-4.6)
- Removed "in seconds" claim from linear-bootstrap README
- Fixed README tool docs formatting (blank lines between Input/Returns/API calls)

## [0.1.2] - 2026-03-05

### Fixed

- `@toolwright-adk/linear-bootstrap` — publish with `pnpm` to resolve `workspace:^` protocol (npm doesn't understand it)

## [0.1.1] - 2026-03-05

### Fixed

- `@toolwright-adk/linear-bootstrap` — truncate project description to 255 chars before Linear API call

### Changed

- `@toolwright-adk/linear-bootstrap` — dry run now returns the full plan object for review
- `@toolwright-adk/linear-bootstrap` — include `.claude/skills/` directory in npm package
- README paths updated from local `node dist/cli.js` to `npx -y @toolwright-adk/linear-bootstrap`

## [0.1.0] - 2026-03-05

### Added

- `@toolwright-adk/shared` — shared utilities (logging, error handling, context, timing)
- `@toolwright-adk/linear-bootstrap` — MCP server for bootstrapping Linear projects
  - `generate-plan` — generate structured project plans from natural language
  - `validate-plan` — validate plans for structural issues
  - `bootstrap-project` — create complete Linear projects from plans
  - `add-epic` — add epics to existing projects
  - `introspect-workspace` — read team conventions from Linear
  - `generate-and-bootstrap` — combined generate + validate + bootstrap
  - `list-teams` — list accessible Linear teams
- `createServer()` export for embedding the MCP server in custom transports
- SDK barrel export (`@toolwright-adk/linear-bootstrap`) with core functions and types
- Apify actor deployment configuration (`deploy/apify/`)
- Workspace introspection with 30-minute caching
- Plan caching with automatic expiry
- LLM-powered plan generation via OpenAI-compatible APIs
- Comprehensive input validation with Zod schemas
