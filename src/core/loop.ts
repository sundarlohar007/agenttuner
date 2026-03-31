import { createHash, randomUUID } from "node:crypto";
import type { Trajectory, Iteration, Pattern, OptimizationResult } from "./types.js";
import { TrajectoryStore } from "./store.js";
import { scoreTrajectory, averageScore, successRate } from "../eval/engine.js";
import { extractPatterns } from "../analysis/learner.js";
import { generateMutations } from "../optimizer/mutator.js";
import { runAgent, getConfigQuality } from "./executor.js";

/**
 * Hash a config string for tracking.
 */
export function hashConfig(config: string): string {
	return createHash("sha256").update(config).digest("hex").slice(0, 12);
}

export interface LoopConfig {
	initialConfig: string;
	maxIterations: number;
	dbPath?: string;
	onIteration?: (iteration: number, score: number, successRate: number) => void;
}

/**
 * Run the optimization loop.
 *
 * For each iteration:
 * 1. Run agent with current config (deterministic)
 * 2. Score trajectories
 * 3. Store trajectories
 * 4. Extract patterns from store
 * 5. Generate mutations
 * 6. Evaluate mutations
 * 7. Pick best config
 * 8. Save iteration
 */
export async function runOptimizationLoop(
	config: LoopConfig,
): Promise<OptimizationResult> {
	const { initialConfig, maxIterations, onIteration } = config;
	const dbPath = config.dbPath ?? ".agenttuner/loop.db";
	const store = new TrajectoryStore(dbPath);

	let currentConfig = initialConfig;
	let finalPatterns: Pattern[] = [];

	// Baseline run
	const baselineTrajectories = runAgent(currentConfig);
	baselineTrajectories.forEach((t) => {
		t.score = scoreTrajectory(t);
		store.saveTrajectory(t);
	});
	const baselineScore = averageScore(baselineTrajectories);
	const baselineSuccessRate = successRate(baselineTrajectories);

	console.log("");
	console.log("═══════════════════════════════════════════════════");
	console.log("  AgentTuner — Optimization Loop");
	console.log("═══════════════════════════════════════════════════");
	console.log("");
	console.log(`  Config quality: ${getConfigQuality(currentConfig).toFixed(2)}`);
	console.log(`  Baseline score: ${baselineScore.toFixed(2)}`);
	console.log(`  Baseline success: ${(baselineSuccessRate * 100).toFixed(0)}%`);
	console.log("");

	let bestConfig = currentConfig;
	let bestScore = baselineScore;

	// Optimization loop
	for (let i = 0; i < maxIterations; i++) {
		const iterationId = randomUUID();

		// 1. Run agent with current config
		const trajectories = runAgent(currentConfig);

		// 2. Score trajectories
		trajectories.forEach((t) => {
			t.score = scoreTrajectory(t);
		});

		// 3. Store trajectories
		for (const t of trajectories) {
			store.saveTrajectory(t);
		}

		// 4. Extract patterns from store
		const allGoodTrajectories = store.getTrajectories({ minScore: 0.7 });
		const patterns = extractPatterns(allGoodTrajectories);
		finalPatterns = patterns;

		// 5. Generate mutations using learned patterns
		const candidates = generateMutations(currentConfig, patterns);

		// 6. Evaluate mutations
		let iterationBest = {
			config: currentConfig,
			score: averageScore(trajectories),
			mutations: [] as string[],
		};

		for (const candidate of candidates) {
			const candidateTrajectories = runAgent(candidate.config);
			for (const t of candidateTrajectories) {
				t.score = scoreTrajectory(t);
				store.saveTrajectory(t);
			}

			const candidateScore = averageScore(candidateTrajectories);
			if (candidateScore > iterationBest.score) {
				iterationBest = {
					config: candidate.config,
					score: candidateScore,
					mutations: candidate.mutations,
				};
			}
		}

		// 7. Update best config
		if (iterationBest.score > bestScore) {
			bestConfig = iterationBest.config;
			bestScore = iterationBest.score;
		}
		currentConfig = iterationBest.config;

		const iterSuccessRate = successRate(trajectories);
		const configQuality = getConfigQuality(currentConfig);

		// 8. Save iteration
		store.saveIteration({
			id: iterationId,
			iteration: i,
			configHash: hashConfig(currentConfig),
			configContent: currentConfig,
			avgScore: iterationBest.score,
			successRate: iterSuccessRate,
			tokensUsed: trajectories.reduce((sum, t) => sum + t.tokensUsed, 0),
			mutations: iterationBest.mutations,
			timestamp: Date.now(),
		});

		// 9. Log iteration
		const changeIndicator = iterationBest.score > (i === 0 ? baselineScore : store.getIterations()[i - 1]?.avgScore ?? 0)
			? "↑"
			: iterationBest.score < (i === 0 ? baselineScore : store.getIterations()[i - 1]?.avgScore ?? 0)
				? "↓"
				: "=";

		console.log(
			`  Iter ${i + 1}: ${iterationBest.score.toFixed(2)} ${changeIndicator} | ` +
			`success ${(iterSuccessRate * 100).toFixed(0)}% | ` +
			`quality ${configQuality.toFixed(2)} | ` +
			`${iterationBest.mutations.length > 0 ? iterationBest.mutations[0] : "no change"}`,
		);

		// Callback
		onIteration?.(i, iterationBest.score, iterSuccessRate);
	}

	const allIterations = store.getIterations();
	store.close();

	const improvement =
		baselineScore > 0
			? Math.round(((bestScore - baselineScore) / baselineScore) * 10000) / 100
			: 0;

	// Print final report
	console.log("");
	console.log("─────────────────────────────────────────────────");
	console.log("  Results");
	console.log("─────────────────────────────────────────────────");
	console.log("");
	console.log(`  Baseline Score: ${baselineScore.toFixed(2)}`);
	console.log("");
	console.log("  Iteration Results:");
	for (const iter of allIterations) {
		const delta = ((iter.avgScore - baselineScore) / baselineScore * 100);
		const sign = delta >= 0 ? "+" : "";
		console.log(`    Iter ${iter.iteration + 1}: ${iter.avgScore.toFixed(2)} (${sign}${delta.toFixed(1)}%)`);
	}
	console.log("");
	console.log(`  Final Score: ${bestScore.toFixed(2)}`);
	console.log(`  Total Improvement: ${improvement >= 0 ? "+" : ""}${improvement.toFixed(1)}%`);
	console.log("");

	if (finalPatterns.length > 0) {
		console.log("  Top Learned Patterns:");
		for (let i = 0; i < Math.min(3, finalPatterns.length); i++) {
			const p = finalPatterns[i]!;
			console.log(`    ${i + 1}. ${p.pattern} (freq ${p.frequency}, ${(p.successRate * 100).toFixed(0)}% success)`);
		}
	} else {
		console.log("  Top Learned Patterns: none (need more iterations or data)");
	}
	console.log("");

	return {
		baselineScore,
		finalScore: bestScore,
		improvement,
		bestConfig,
		topPatterns: finalPatterns.slice(0, 3),
		iterations: allIterations,
	};
}
