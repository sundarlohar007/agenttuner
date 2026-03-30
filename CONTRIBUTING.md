# Contributing to AgentTuner

Thanks for your interest in contributing.

## Getting Started

```bash
git clone https://github.com/sundarlohar007/agenttuner.git
cd agenttuner
pnpm install
```

## Development

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type check
pnpm typecheck

# Lint
pnpm lint

# Fix lint issues
pnpm lint:fix

# Build
pnpm build
```

## Project Structure

```
src/
├── analyzers/      # Waste pattern detection
├── collectors/     # Session data collection from agents
├── diagnostics/    # Config file analysis and scoring
├── optimizer/      # Config optimization (LLM + rule-based)
├── report/         # Terminal, HTML, Markdown output
├── utils/          # File system, JSONL parsing, platform
└── cli.ts          # CLI entry point

tests/
├── analyzers/      # Analyzer tests
├── collectors/     # Collector tests
├── diagnostics/    # Diagnostics tests
├── optimizer/      # Optimizer tests
├── utils/          # Utility tests
└── fixtures.ts     # Shared test fixtures
```

## Adding a New Waste Pattern

1. Add the pattern type to `src/analyzers/types.ts`
2. Create the detection function in `src/analyzers/` (loops.ts or waste.ts)
3. Register it in the appropriate `detectAll*` function
4. Add tests in `tests/analyzers/`
5. Add the label to `formatWasteType` in report files

## Adding a New Diagnostic Rule

1. Add the rule to the `RULES` array in `src/diagnostics/rules.ts`
2. Include `id`, `severity`, `weight`, and `check` function
3. Add tests in `tests/diagnostics/rules.test.ts`

## Adding a New Agent Collector

1. Create a new file in `src/collectors/`
2. Implement the collector function returning `UnifiedSession[]`
3. Add the agent type to `AgentType` in `src/collectors/types.ts`
4. Register in `src/collectors/index.ts`
5. Add base directory detection in `src/utils/fs.ts`
6. Add tests in `tests/collectors/`

## Code Style

- TypeScript strict mode
- Tabs for indentation
- Double quotes for strings
- Biome for linting and formatting
- No comments unless necessary

## Pull Requests

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Add or update tests
5. Run `pnpm test` and `pnpm typecheck`
6. Submit a PR

## Reporting Issues

Include:
- AgentTuner version (`agenttuner --version`)
- Node.js version (`node --version`)
- Operating system
- Steps to reproduce
- Expected vs actual behavior
