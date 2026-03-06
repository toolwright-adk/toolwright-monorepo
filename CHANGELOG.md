# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
