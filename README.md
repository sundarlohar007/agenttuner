<div align="center">

# AgentTuner

**Train your AI agents to improve themselves automatically.**

A self-improving loop that runs your agent, learns from execution, and finds better configs — automatically.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-221%20passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)]()

[Quick Start](#quick-start) · [How It Works](#how-it-works) · [Demo](#demo) · [Why This Exists](#why-this-exists)

</div>

---

## What It Does

AgentTuner runs your AI agent, watches how it performs, learns from successful runs, and automatically finds better configurations.

**It improves your agent. Not just measures it.**

```
Input:   Vague config ("write clean code, follow best practices")
                ↓
Loop:    Run → Evaluate → Learn → Mutate → Re-run
                ↓
Output:  Structured config with commands, constraints, pitfalls
```

**Result: +269% improvement in agent success rate.**

---

## The Problem

Your AI agent's config (CLAUDE.md, AGENTS.md, .cursorrules) is full of vague instructions:

```markdown
Always write clean code. Ensure proper error handling.
Follow best practices. Be careful with async operations.
```

Your agent:
- Re-reads the same file 4 times
- Explores 15 files before starting
- Runs `npm test` three times in a row
- Writes a file then immediately edits it

**Your config is wasting tokens and producing bad results.**

---

## The Solution

AgentTuner runs a self-improving loop:

```bash
npx agenttuner optimize --iterations 5
```

```
═══════════════════════════════════════════════════
  Self-Improving Loop
═══════════════════════════════════════════════════

  Baseline:  0.26  (vague config, 20% success rate)

  Iter 1:    0.68  ↑  Removed vague phrases
  Iter 2:    0.96  ↑  Added commands with backticks
  Iter 3:    0.96  →  Plateau reached

  Final:     0.96  (+269% improvement)
```

---

## Before vs After

**Before (score 0.25, 20% success):**

```markdown
# My Project

Always write clean code. Ensure proper error handling.
Follow best practices. Be careful with async operations.
Make sure to handle all edge cases.
```

**After (score 0.85, 100% success):**

```markdown
# My Project

## Commands
- Install: `npm install`
- Test: `npm test`
- Lint: `npm run lint`
- Build: `npm run build`

## Constraints
- Never modify lock files directly
- Never commit .env files
- Never skip TypeScript errors

## Common Pitfalls
- Don't re-read files — assume content hasn't changed
- Run commands once. Analyze output before retrying.
- Read specific files. Avoid broad directory exploration.
```

---

## Quick Start

```bash
# Install
npm install -D agenttuner

# Run the demo
npm run demo
```

**Takes less than 2 minutes.**

---

## How It Works

### Step 1: Run Your Agent

AgentTuner executes your agent on a fixed set of tasks using your current config.

### Step 2: Evaluate Results

Each run is scored on:
- **Success rate** (70% weight) — did the agent complete the task?
- **Token efficiency** (30% weight) — how many tokens were used?

### Step 3: Learn Patterns

From successful runs, AgentTuner extracts patterns:
- Which tool sequences lead to success?
- What reasoning patterns work best?

### Step 4: Generate Mutations

Based on learned patterns and config analysis, AgentTuner generates mutations:
- Remove vague instructions
- Add specific commands
- Add constraints section
- Add common pitfalls

### Step 5: Select Best

Each mutation is evaluated. The best one becomes the new config for the next iteration.

---

## Demo

Run the built-in demo:

```bash
git clone https://github.com/sundarlohar007/agenttuner.git
cd agenttuner
npm install
npm run demo
```

**Output:**

```
═══════════════════════════════════════════════════
  AgentTuner — Self-Improving Loop Demo
═══════════════════════════════════════════════════

  Baseline config (vague, no structure):

    # My Project
    Always write clean code. Ensure proper error handling.
    Follow best practices. Be careful with async operations.

  Config quality: 0.25
  Baseline score:  0.26

  Running 5 iterations...

  Iter 1: 0.68 ↑  | Removed vague phrases
  Iter 2: 0.96 ↑  | Added commands with backticks
  Iter 3: 0.96 →  | no change
  Iter 4: 0.96 →  | no change
  Iter 5: 0.96 →  | no change

  ─────────────────────────────────────────────────
  Results
  ─────────────────────────────────────────────────

  Baseline Score:  0.26
  Final Score:     0.96
  Improvement:     +269%
```

---

## Why This Exists

| Other Tools | AgentTuner |
|-------------|------------|
| Measure agent performance | **Improves** agent performance |
| Show you what went wrong | **Fixes** what went wrong |
| Require manual config writing | **Generates** better configs |
| Static analysis | **Learning** from execution |

Most tools tell you: *"Your agent wasted 2000 tokens."*

AgentTuner tells you: *"Here's a config that wastes fewer tokens — and I found it automatically."*

---

## CLI Commands

```bash
# Run self-improving loop
agenttuner optimize --iterations 5

# Scan existing sessions
agenttuner scan

# Diagnose config quality
agenttuner diagnose

# Auto-fix config
agenttuner fix
```

---

## Supported Agents

Claude Code · Cursor · Windsurf · Gemini · Aider · Cline · OpenCode · Copilot · Antigravity · Codex

---

## Why "AgentTuner"?

Your AI agent is only as good as its config.

Most configs are written once and never updated. They accumulate vague instructions and outdated rules. Your agent wastes tokens and makes mistakes the config was supposed to prevent.

AgentTuner treats your config like code — something to be measured, tested, and improved based on real execution data.

---

## Contributing

```bash
git clone https://github.com/sundarlohar007/agenttuner.git
cd agenttuner
npm install
npm test
```

---

## License

MIT

---

<div align="center">

**⭐ Star this repo if you're building with AI agents**

[![GitHub stars](https://img.shields.io/github/stars/sundarlohar007/agenttuner?style=social)](https://github.com/sundarlohar007/agenttuner)

</div>
