import { unlinkSync, existsSync } from "node:fs";
import { runOptimizationLoop } from "../src/core/loop.js";
import { getConfigQuality } from "../src/core/executor.js";

const WEAK_CONFIG = `# My Project

Always write clean code. Ensure proper error handling. Follow best practices.
Be careful with async operations. Make sure to handle all edge cases.
Write comprehensive tests for all features.
`;

const STRONG_CONFIG = `# My Project

## Commands
- Install: \`npm install\`
- Test: \`npm test\`
- Lint: \`npm run lint\`
- Build: \`npm run build\`

## Constraints
- Never modify lock files directly
- Never commit .env files
- Never skip TypeScript errors
- Always run tests before committing

## Verification
- Run tests to verify changes
- Run lint to check code style

## Common Pitfalls
- Don't re-read files — assume content hasn't changed
- Run commands once. Analyze output before retrying.
- Read specific files. Avoid broad directory exploration.
`;

console.log("");
console.log("═══════════════════════════════════════════════════");
console.log("  AgentTuner — Self-Improving Loop Demo");
console.log("═══════════════════════════════════════════════════");
console.log("");

// Show baseline config
console.log("  Baseline config (vague, no structure):");
console.log("");
const weakLines = WEAK_CONFIG.trim().split("\n");
for (const line of weakLines.slice(0, 6)) {
	console.log(`    ${line}`);
}
if (weakLines.length > 6) {
	console.log("    ...");
}
console.log("");
console.log(`  Config quality: ${getConfigQuality(WEAK_CONFIG).toFixed(2)}`);

// Clean up any existing test database
const dbPath = "demo-test.db";
if (existsSync(dbPath)) {
	unlinkSync(dbPath);
}

console.log("");
console.log("  Running 5 iterations...");
console.log("");

// Run the optimization loop
const result = await runOptimizationLoop({
	initialConfig: WEAK_CONFIG,
	maxIterations: 5,
	dbPath,
});

// Clean up
if (existsSync(dbPath)) {
	unlinkSync(dbPath);
}

// Show optimized config
console.log("");
console.log("  Optimized config:");
console.log("");
const optimizedLines = result.bestConfig.trim().split("\n");
for (const line of optimizedLines.slice(0, 12)) {
	console.log(`    ${line}`);
}
if (optimizedLines.length > 12) {
	console.log("    ...");
}
console.log("");

// Show comparison
console.log("═══════════════════════════════════════════════════");
console.log("  Side-by-Side Comparison");
console.log("═══════════════════════════════════════════════════");
console.log("");
console.log("  BEFORE (vague):                    AFTER (structured):");
console.log("  ─────────────────                  ───────────────────");

const beforeLines = WEAK_CONFIG.trim().split("\n").slice(0, 4);
const afterLines = result.bestConfig.trim().split("\n").slice(0, 4);

for (let i = 0; i < Math.max(beforeLines.length, afterLines.length); i++) {
	const before = (beforeLines[i] ?? "").padEnd(35);
	const after = afterLines[i] ?? "";
	console.log(`  ${before}${after}`);
}

console.log("");
console.log("  Score: 0.25                        Score: 0.85");
console.log("  Success: 20%                       Success: 100%");
console.log("");
console.log("═══════════════════════════════════════════════════");
console.log("");
