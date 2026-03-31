import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { unlinkSync, existsSync, mkdirSync } from "node:fs";
import { runAgent, getConfigQuality } from "../../src/core/executor.js";
import { runOptimizationLoop } from "../../src/core/loop.js";
import { scoreTrajectory, averageScore, successRate } from "../../src/eval/engine.js";
import { generateMutations } from "../../src/optimizer/mutator.js";

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
- Never modify node_modules
- Never skip TypeScript errors
- Never commit .env files

## Verification
- Run \`npm test\` to verify
- Run \`npm run lint\` before committing

## Common Pitfalls
- Don't re-read files — assume content hasn't changed
- Run commands once, analyze output before retrying
`;

function scoreTrajectories(trajs: Array<{ score: number; outcome: string }>) {
	for (const t of trajs) {
		t.score = scoreTrajectory(t as Parameters<typeof scoreTrajectory>[0]);
	}
}

describe("Validation: Optimization System", () => {
	const testDbPath = "test-validation.db";

	beforeEach(() => {
		if (existsSync(testDbPath)) {
			unlinkSync(testDbPath);
		}
	});

	afterEach(() => {
		if (existsSync(testDbPath)) {
			unlinkSync(testDbPath);
		}
	});

	describe("Test 1: Config Sensitivity", () => {
		it("should rank configs: strong > weak", () => {
			const weakQuality = getConfigQuality(WEAK_CONFIG);
			const strongQuality = getConfigQuality(STRONG_CONFIG);

			expect(strongQuality).toBeGreaterThan(weakQuality);
		});

		it("should produce different scores for different configs", () => {
			const weakTrajectories = runAgent(WEAK_CONFIG);
			const strongTrajectories = runAgent(STRONG_CONFIG);

			for (const t of weakTrajectories) t.score = scoreTrajectory(t);
			for (const t of strongTrajectories) t.score = scoreTrajectory(t);

			const weakScore = averageScore(weakTrajectories);
			const strongScore = averageScore(strongTrajectories);

			expect(strongScore).toBeGreaterThan(weakScore);
		});

		it("should have higher success rate for strong config", () => {
			const weakTrajectories = runAgent(WEAK_CONFIG);
			const strongTrajectories = runAgent(STRONG_CONFIG);

			for (const t of weakTrajectories) t.score = scoreTrajectory(t);
			for (const t of strongTrajectories) t.score = scoreTrajectory(t);

			const weakSuccess = successRate(weakTrajectories);
			const strongSuccess = successRate(strongTrajectories);

			expect(strongSuccess).toBeGreaterThanOrEqual(weakSuccess);
		});

		it("should have fewer tokens for strong config", () => {
			const weakTrajectories = runAgent(WEAK_CONFIG);
			const strongTrajectories = runAgent(STRONG_CONFIG);

			const weakTokens = weakTrajectories.reduce((s, t) => s + t.tokensUsed, 0);
			const strongTokens = strongTrajectories.reduce((s, t) => s + t.tokensUsed, 0);

			expect(strongTokens).toBeLessThanOrEqual(weakTokens);
		});
	});

	describe("Test 2: Generalization", () => {
		it("should transfer improvements across task types", async () => {
			const result = await runOptimizationLoop({
				initialConfig: WEAK_CONFIG,
				maxIterations: 3,
				dbPath: testDbPath,
			});

			const bestTrajectories = runAgent(result.bestConfig);
			for (const t of bestTrajectories) t.score = scoreTrajectory(t);

			const baselineTrajectories = runAgent(WEAK_CONFIG);
			for (const t of baselineTrajectories) t.score = scoreTrajectory(t);

			const bestScore = averageScore(bestTrajectories);
			const baselineScore = averageScore(baselineTrajectories);

			expect(bestScore).toBeGreaterThanOrEqual(baselineScore);
		});
	});

	describe("Test 3: Mutation Impact", () => {
		it("should produce different trajectories for mutated configs", () => {
			const originalTrajectories = runAgent(WEAK_CONFIG);
			const originalTokens = originalTrajectories.reduce((s, t) => s + t.tokensUsed, 0);

			const mutations = generateMutations(WEAK_CONFIG, []);

			let foundDifferent = false;
			for (const mutation of mutations) {
				const mutatedTrajectories = runAgent(mutation.config);
				const mutatedTokens = mutatedTrajectories.reduce((s, t) => s + t.tokensUsed, 0);

				if (mutatedTokens !== originalTokens) {
					foundDifferent = true;
					break;
				}
			}

			if (mutations.length > 0) {
				expect(foundDifferent).toBe(true);
			}
		});

		it("should log meaningful mutations", () => {
			const mutations = generateMutations(WEAK_CONFIG, []);

			for (const mutation of mutations) {
				expect(mutation.mutations.length).toBeGreaterThan(0);
				expect(mutation.config).not.toBe(WEAK_CONFIG);
			}
		});
	});

	describe("Test 4: Plateau Detection", () => {
		it("should show improvement then plateau over 10 iterations", async () => {
			const result = await runOptimizationLoop({
				initialConfig: WEAK_CONFIG,
				maxIterations: 10,
				dbPath: testDbPath,
			});

			expect(result.finalScore).toBeGreaterThan(result.baselineScore);

			const lastIterations = result.iterations.slice(-3);
			if (lastIterations.length === 3) {
				const scores = lastIterations.map((i) => i.avgScore);
				const maxDiff = Math.max(...scores) - Math.min(...scores);

				const isPlateau = maxDiff < 0.05;
				const isConsistentImprovement = (scores[2] ?? 0) > (scores[0] ?? 0);

				expect(isPlateau || isConsistentImprovement).toBe(true);
			}
		});

		it("should not have artificial infinite improvement", async () => {
			const result = await runOptimizationLoop({
				initialConfig: WEAK_CONFIG,
				maxIterations: 10,
				dbPath: testDbPath,
			});

			expect(result.improvement).toBeLessThan(300);
		});
	});

	describe("Test 5: Determinism", () => {
		it("should produce identical results for same config", () => {
			const trajectories1 = runAgent(WEAK_CONFIG);
			const trajectories2 = runAgent(WEAK_CONFIG);

			for (const t of trajectories1) t.score = scoreTrajectory(t);
			for (const t of trajectories2) t.score = scoreTrajectory(t);

			const score1 = averageScore(trajectories1);
			const score2 = averageScore(trajectories2);

			expect(score1).toBe(score2);
		});

		it("should produce same outcomes for same config", () => {
			const trajectories1 = runAgent(STRONG_CONFIG);
			const trajectories2 = runAgent(STRONG_CONFIG);

			const outcomes1 = trajectories1.map((t) => t.outcome).join(",");
			const outcomes2 = trajectories2.map((t) => t.outcome).join(",");

			expect(outcomes1).toBe(outcomes2);
		});
	});
});
