# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `linear-project-manager` — Claude Code plugin for Linear project management
  - `/linear` command — routes to the right skill based on intent
  - `/linear-check` command — probes both MCP servers and reports health
  - `linear-planner` agent — tool selection heuristics (batch vs individual)
  - `linear-ops` agent — day-to-day triage, status updates, cycle management
  - `linear-bootstrap` skill (hardened) — prerequisite checks, error recovery, `allowed-tools`
  - `linear-expand` skill — add epics to existing projects via `add-epic`
  - `linear-status` skill — project health reports with optional Linear status posting
- Cross-platform portability snippets for Cursor, Windsurf, Codex, Roo Code, and Cline
- Plugin marketplace (`.claude-plugin/marketplace.json`) with `git-subdir` distribution
- `@toolwright-adk/claude-code-plugins` — test suite (17 tests: manifest validation, skill integrity, MCP command safety)

### Changed

- `@toolwright-adk/linear-bootstrap` — enriched MCP tool descriptions with RECOMMENDED usage guidance
- `@toolwright-adk/linear-bootstrap` — `createRequire` version reading wrapped in try/catch for bundled deployments
- `@toolwright-adk/linear-bootstrap` — SKILL.md canonical source moved to linear-project-manager; prepack/postpack copies at publish time
- `@toolwright-adk/linear-bootstrap` — reverted manifest MCP command to `npx -y` (bare binary only works locally)

### Fixed

- `linear-expand` and `linear-status` skills missing `mcp__linear__list_projects` in `allowed-tools`
- Marketplace `owner.email` field was a URL (changed to `owner.url`)

## [0.1.4] - 2026-03-06

### Added

- `@toolwright-adk/linear-bootstrap` — HTTP/SSE transport via `createHttpApp()` and `startHttpServer()` exports
- New `@toolwright-adk/linear-bootstrap/http` subpath export for direct HTTP module import
- `linear-bootstrap-http` CLI binary for running the MCP server over Streamable HTTP
- `/health` endpoint on HTTP server for readiness probes

### Changed

- Apify actor refactored to use shared HTTP transport from the main package

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
