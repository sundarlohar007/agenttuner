# Launch Materials

## GitHub Description

```
Train your AI agents to improve themselves using execution feedback
```

## GitHub Tags

```
ai
llm
agents
autonomous-agents
prompt-engineering
developer-tools
typescript
ai-tools
automation
openai
anthropic
```

---

## Twitter / X Post

```
I built a tool that trains AI agents to improve themselves.

It runs a simple loop:
→ Execute agent on tasks
→ Score the results
→ Learn from successful runs
→ Generate better configs
→ Re-run

Result: +269% improvement in success rate.

No manual tuning. No API keys needed.

github.com/sundarlohar007/agenttuner

#ai #agents #opensource
```

---

## Reddit Post

**Title:** I built a self-improving AI agent loop (TypeScript)

**Body:**

I got tired of writing CLAUDE.md files that my AI agent ignores half the time.

So I built a tool that runs your agent, watches how it performs, learns from successful runs, and automatically finds better configurations.

**How it works:**

1. Run agent with current config
2. Score each run (success rate + token efficiency)
3. Extract patterns from high-scoring runs
4. Generate config mutations
5. Select the best one
6. Repeat

**Example result:**

- Baseline: 0.26 score (vague config, 20% success rate)
- After 2 iterations: 0.96 score (structured config, 100% success rate)
- Improvement: +269%

**What it does NOT do:**
- No API keys required (runs entirely offline)
- No data sent anywhere
- No UI to learn

**What it supports:**
- Claude Code, Cursor, Windsurf, Gemini, Aider, Cline, OpenCode, Copilot, Codex
- Any config file (CLAUDE.md, AGENTS.md, .cursorrules, etc.)

**Try it:**

```
git clone https://github.com/sundarlohar007/agenttuner.git
cd agenttuner
npm install
npm run demo
```

Takes less than 2 minutes to see it work.

Feedback welcome. Happy to answer questions.

---

## Demo Recording Plan

### What to Record (GIF)

1. **Start** (2 seconds)
   - Show terminal with `npm run demo`

2. **Baseline Output** (3 seconds)
   - Show "Baseline config (vague, no structure)"
   - Show config quality: 0.25

3. **Loop Execution** (8 seconds)
   - Show iterations appearing one by one
   - Highlight the ↑ arrows showing improvement
   - Show "Iter 1: 0.68 ↑" then "Iter 2: 0.96 ↑"

4. **Results** (4 seconds)
   - Show "Baseline Score: 0.26"
   - Show "Final Score: 0.96"
   - Show "Improvement: +269%"

5. **Before/After** (3 seconds)
   - Side-by-side comparison of configs
   - Highlight the difference

**Total GIF length: ~20 seconds**

### Recording Setup

```bash
# Terminal settings
- Font: JetBrains Mono or Fira Code
- Theme: Dark (Dracula or One Dark)
- Size: 80x24

# Recording
- Use terminalizer or asciinema
- Speed: 1.5x for loop iterations
- Highlight key moments with pause
```

---

## Positioning

**Do NOT use:**
- framework
- optimizer
- evaluation tool
- platform

**DO use:**
- self-improving
- training
- learning
- automatic improvement
- execution feedback
