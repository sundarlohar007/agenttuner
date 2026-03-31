import type { Trajectory } from "../core/types.js";

/**
 * Score a trajectory based on outcome and token efficiency.
 *
 * successScore = 1 if success, 0 if failure
 * tokenPenalty = normalized token usage (0-0.3)
 * finalScore = successScore * 0.7 + (1 - tokenPenalty) * 0.3
 */
export function scoreTrajectory(trajectory: Trajectory): number {
	const successScore = trajectory.outcome === "success" ? 1 : 0;

	// Normalize token usage: cap at 10K tokens
	const normalizedTokens = Math.min(trajectory.tokensUsed, 10000) / 10000;
	const tokenPenalty = normalizedTokens * 0.3;

	// Weighted combination: 70% success, 30% efficiency
	const finalScore = successScore * 0.7 + (1 - tokenPenalty) * 0.3;

	return Math.round(finalScore * 100) / 100;
}

/**
 * Compute average score across multiple trajectories.
 */
export function averageScore(trajectories: Trajectory[]): number {
	if (trajectories.length === 0) return 0;
	const total = trajectories.reduce((sum, t) => sum + t.score, 0);
	return Math.round((total / trajectories.length) * 100) / 100;
}

/**
 * Compute success rate across multiple trajectories.
 */
export function successRate(trajectories: Trajectory[]): number {
	if (trajectories.length === 0) return 0;
	const successes = trajectories.filter((t) => t.outcome === "success").length;
	return Math.round((successes / trajectories.length) * 100) / 100;
}
