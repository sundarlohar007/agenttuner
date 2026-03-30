<div align="center">

# AgentTuner

**Your CLAUDE.md is wasting tokens. Fix it.**

*Auto-optimize your AI coding agent configs from real session data.*

[![npm version](https://img.shields.io/npm/v/agenttuner)](https://www.npmjs.com/package/agenttuner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-149%20passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)]()

[Installation](#-installation) • [Quick Start](#-quick-start) • [How It Works](#-how-it-works) • [Commands](#-commands) • [FAQ](#-faq)

</div>

---

## The Problem

You spent 20 minutes writing a CLAUDE.md file. You told the agent to "write clean code" and "follow best practices." You added 300 lines of instructions.

**Your agent ignores half of it.** The other half actively wastes tokens.

```
Session 1:  Agent reads the same file 4 times          → 2,000 wasted tokens
Session 2:  Agent runs `npm test` three times in a row  → 900 wasted tokens
Session 3:  Agent explores 15 files before starting     → 8,000 wasted tokens
Session 4:  Agent writes a file then immediately edits   → 1,600 wasted tokens
```

**That's $12.50 wasted this week.** Multiply that across your team.

## The Solution

AgentTuner reads your actual agent sessions, finds the waste, and tells you exactly what to fix in your config.

```bash
npx agenttuner scan
```

```
═══════════════════════════════════════════════════
  AgentTuner — Session Analysis Report
═══════════════════════════════════════════════════

📊 Summary
   Sessions analyzed:  47
   Total tokens used:  2.3M
   Estimated waste:    412K tokens
   Estimated cost:     $18.73 wasted

🔴 Top Waste Categories
   ██████████ Exploration Loops — 180K tokens (94x)
   ████████   Repeated File Reads — 120K tokens (67x)
   ████       Repeated Commands — 72K tokens (45x)
   ███        File Churn — 40K tokens (22x)
```

Then fix it:

```bash
npx agenttuner fix
```

```
═══════════════════════════════════════════════════
  AgentTuner — Optimization Diff
═══════════════════════════════════════════════════

--- a/CLAUDE.md
+++ b/CLAUDE.md
-## Guidelines
-Always write clean code. Ensure proper error handling.
-Follow best practices at all times. Be careful with
-async operations. Make sure to handle all edge cases.
-
-Always use TypeScript. Never use var. Always prefer
-const over let. Never forget to add types.
-
+## Conventions
+- Prefer `const` over `let`. Never use `var`.
+- Use `unknown` over `any`. Add explicit return types.
+
+## Common Pitfalls
+- Don't re-read files — assume content hasn't changed
+- Run commands once. Analyze output before retrying.
+- Read specific files. Avoid broad directory exploration.
+
+## Commands
+- Test: `pnpm test`
+- Lint: `pnpm lint`
+- Build: `pnpm build`
+
+## Verification
+- Run `pnpm test && pnpm lint` before marking complete

Backup saved to CLAUDE.md.bak
Optimized CLAUDE.md (+12/-8 lines)
```

---

## Installation

```bash
# Use directly with npx (recommended)
npx agenttuner scan

# Or install globally
npm install -g agenttuner

# Or as a dev dependency
npm install -D agenttuner
```

Requires Node.js 18+

---

## Quick Start

```bash
# 1. See how much your config is wasting
npx agenttuner scan

# 2. Get a quality score for your config
npx agenttuner diagnose

# 3. Auto-fix your config
npx agenttuner fix

# 4. Preview changes without applying
npx agenttuner diff
```

---

## How It Works

### 1. Session Collection

AgentTuner reads session transcripts from:

| Agent | Location |
|-------|----------|
| Claude Code | `~/.claude/` |
| Cursor | `~/Library/Application Support/Cursor/` (macOS) |
| Codex | `~/.codex/sessions/` |

It parses JSONL session files and extracts tool calls, token usage, and conversation patterns.

### 2. Waste Detection

Seven waste patterns are detected automatically:

| Pattern | What It Means | Example |
|---------|---------------|---------|
| **Repeated Reads** | Same file read 3+ times | Agent reads `package.json` in turns 2, 5, 8 |
| **Repeated Commands** | Same command run 3+ times | `npm test` runs 4 times with same result |
| **Exploration Loops** | 3+ Glob/Grep/ls in one turn | Agent searches instead of reading known files |
| **File Churn** | Write then immediate edit | Agent writes file, fixes mistake next turn |
| **Idle Turns** | Short response, no tools | "OK" response that cost 200 tokens |
| **Empty Results** | Tool returns nothing | Glob for `*.py` in a TypeScript project |
| **Ignored Outputs** | Large output, tiny response | 5000 char file read, 50 char reply |

### 3. Config Diagnostics

Your config is scored 0-100 against 12 rules:

```
═══════════════════════════════════════════════════
  AgentTuner — Config Diagnostic Report
═══════════════════════════════════════════════════

🎯 Config Score: 55/100 (Needs Work)
   File: CLAUDE.md (87 lines)

⚠️  Issues Found (4)
   ✗ Contains vague instructions: "write clean code", "follow best practices"
     → Replace with specific, verifiable instructions
   ✗ Missing build/test commands section.
     → Add a "## Commands" section with exact commands
   ⚠ Config is mostly prose paragraphs. Agents process bullet points better.
     → Convert prose into bullet points
   ⚠ 6 uses of ALWAYS/NEVER. These leave no room for exceptions.
     → Use "prefer" and "avoid" with explicit exception clauses

📝 Missing Recommended Sections
   - Architecture
   - Common Pitfalls
   - Constraints
   - Verification
```

### 4. Optimization

AgentTuner can optimize your config using:

- **LLM APIs** (Anthropic or OpenAI) when API keys are available
- **Rule-based optimization** as a fallback

The optimizer follows these principles:

- Keep under 100 lines
- Remove ALL vague instructions
- Replace ALWAYS/NEVER with prefer/avoid
- Remove info the agent can already see (package.json, tsconfig)
- Use bullet points, not paragraphs
- Every instruction must be verifiable with a command

---

## Commands

### `scan`

Analyze past agent sessions and show waste report.

```bash
agenttuner scan [path] [options]

Options:
  -a, --agents <agents>     Agents to scan (claude-code,cursor,codex)
  -o, --output <format>     Output format: terminal, html, markdown
  --output-file <path>      Output file path (for html/markdown)
```

**Examples:**

```bash
# Scan current directory
agenttuner scan

# Scan specific project
agenttuner scan ~/projects/my-app

# Only scan Claude Code sessions
agenttuner scan --agents claude-code

# Generate HTML report
agenttuner scan --output html --output-file report.html

# Generate Markdown report
agenttuner scan --output markdown --output-file report.md
```

### `diagnose`

Score your agent config and show issues.

```bash
agenttuner diagnose [path]
```

Checks for:
- Vague instructions ("write clean code", "follow best practices")
- Missing critical sections (Commands, Constraints, Verification)
- ALWAYS/NEVER overuse
- Prose-heavy formatting
- Duplicated linter/formatter rules
- Restated package.json information
- Missing escalation rules

### `fix`

Auto-optimize your agent config.

```bash
agenttuner fix [path] [options]

Options:
  --dry-run        Show changes without applying
  --no-backup      Skip creating backup of original file
```

**Examples:**

```bash
# Fix with backup
agenttuner fix

# Preview changes only
agenttuner fix --dry-run

# Fix without backup
agenttuner fix --no-backup
```

### `diff`

Show what the optimizer would change.

```bash
agenttuner diff [path]
```

### `report`

Generate a full HTML or Markdown report.

```bash
agenttuner report [path] [options]

Options:
  -f, --format <format>    Report format: html, markdown
  -o, --output <path>      Output file path
```

### `agents`

Show detected coding agents and their session paths.

```bash
agenttuner agents
```

```
Detected Coding Agents:

  ✓ found  claude-code
           /home/user/.claude
  ✗ not found  cursor
           /home/user/.config/Cursor
  ✗ not found  codex
           /home/user/.codex
```

---

## Supported Config Files

AgentTuner scans for these config files:

| File | Agent |
|------|-------|
| `CLAUDE.md` | Claude Code |
| `.claude/CLAUDE.md` | Claude Code (project) |
| `AGENTS.md` | Generic |
| `.cursorrules` | Cursor |
| `.windsurfrules` | Windsurf |
| `copilot-instructions.md` | GitHub Copilot |
| `.github/copilot-instructions.md` | GitHub Copilot |
| `GEMINI.md` | Gemini |
| `.gemini/GEMINI.md` | Gemini |

---

## What a Good Config Looks Like

Before AgentTuner:

```markdown
# My Project

This is a TypeScript project that uses React for the frontend and Node.js for the backend.
We use pnpm as our package manager. We follow best practices for code quality and always
write clean, maintainable code. Error handling is very important to us, so always ensure
proper error handling is in place. We use ESLint and Prettier for code formatting.

ALWAYS use TypeScript strict mode. NEVER use `any` type. ALWAYS write tests for new
features. NEVER commit without running the linter. ALWAYS use async/await for
asynchronous operations. NEVER use callbacks.
```

**Score: 35/100** — 200+ tokens wasted per session on this config alone.

After AgentTuner:

```markdown
# My Project

## Architecture
TypeScript monorepo. React frontend, Node.js backend, pnpm workspace.

## Commands
- Install: `pnpm install`
- Dev: `pnpm dev`
- Test: `pnpm test`
- Lint: `pnpm lint`
- Build: `pnpm build`

## Conventions
- Prefer `const` over `let`. Never use `var`.
- Use `unknown` over `any`. Add explicit return types.
- Prefer `async/await` over callbacks.

## Constraints
- Never modify `pnpm-lock.yaml` directly
- Never commit `.env` files
- Never skip TypeScript errors

## Verification
- Run `pnpm test && pnpm lint` before marking complete

## Common Pitfalls
- Don't re-read files — assume content hasn't changed
- Run commands once. If they fail, analyze output before retrying
- Read specific files instead of exploring directories broadly
```

**Score: 92/100** — Clear, actionable, verifiable.

---

## FAQ

### Does this work with any AI coding agent?

Yes. AgentTuner supports Claude Code, Cursor, Codex, and any agent that uses CLAUDE.md, AGENTS.md, .cursorrules, or similar config files.

### Is my session data sent anywhere?

No. All analysis happens locally. Session data never leaves your machine. The optional LLM optimization sends only your config file content (not session data) to the API.

### Do I need an API key?

No. AgentTuner works fully without API keys. The rule-based optimizer is the default. If you set `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`, it will use LLM-based optimization instead.

### What's the ideal config length?

Under 100 lines. Agents process shorter configs more reliably. Every line should answer: "If I remove this, will the agent make a mistake it cannot recover from?"

### How often should I run this?

After major project changes, after switching teams, or whenever you notice the agent making repeated mistakes. Monthly is a good baseline.

### Can I use this in CI/CD?

Yes. Use `agenttuner diagnose` to fail builds if config quality drops below a threshold. Use `--output json` for machine-readable output (coming soon).

---

## Why "AgentTuner"?

Your coding agent is only as good as its config.

Most CLAUDE.md files are written once and never updated. They accumulate vague instructions, redundant rules, and outdated information. Your agent wastes tokens processing useless instructions and makes mistakes the config was supposed to prevent.

AgentTuner fixes this by treating your config like code — something to be measured, tested, and optimized based on real data.

---

## Contributing

Contributions welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

```bash
# Clone the repo
git clone https://github.com/sundarlohar007/agenttuner.git
cd agenttuner

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build
```

---

## License

MIT © [sundarlohar007](https://github.com/sundarlohar007)

---

<div align="center">

**If this saved you tokens, star it.**

⭐ Star on GitHub

</div>
