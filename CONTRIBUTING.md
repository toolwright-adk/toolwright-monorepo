# Contributing

## Development Setup

```bash
git clone https://github.com/toolwright-adk/toolwright-monorepo.git
cd toolwright-monorepo
pnpm install
pnpm build
```

## Running Tests

```bash
pnpm test                              # run all tests across packages
cd packages/linear-bootstrap && pnpm test:watch  # watch mode (per-package)
```

## Code Style

This project uses ESLint + Prettier, enforced via Husky pre-commit hooks. No manual formatting needed — just commit and the hooks handle it.

```bash
pnpm lint           # ESLint
pnpm format:check   # Prettier check
pnpm format         # Prettier fix
```

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes with tests
3. Ensure `pnpm build && pnpm test` passes
4. Open a PR — the pre-commit hooks validate lint and formatting automatically

## Filing Issues

Use the [issue templates](https://github.com/toolwright-adk/toolwright-monorepo/issues/new/choose) for bug reports and feature requests.
