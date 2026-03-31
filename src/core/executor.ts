import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import type { Trajectory, TrajectoryStep } from "./types.js";
import { FIXED_TASKS, type Task } from "./tasks.js";

/**
 * Evaluate config quality (0-1).
 *
 * Checks for:
 * - Specific commands (not vague)
 * - Constraints section
 * - Verification section
 * - Pitfalls section
 * - Short length (< 100 lines)
 * - No vague phrases
 */
function evaluateConfigQuality(config: string): number {
	let score = 0.3; // Base score
	const lower = config.toLowerCase();
	const lines = config.split("\n").length;

	// Has specific commands with backticks
	if (config.includes("`") && (lower.includes("command") || lower.includes("install"))) {
		score += 0.15;
	}

	// Has constraints section
	if (lower.includes("constraint") || lower.includes("never")) {
		score += 0.1;
	}

	// Has verification section
	if (lower.includes("verif") || lower.includes("test")) {
		score += 0.1;
	}

	// Has pitfalls section
	if (lower.includes("pitfall") || lower.includes("common mistake")) {
		score += 0.1;
	}

	// Short and focused
	if (lines < 80) {
		score += 0.05;
	}

	// Penalize vague phrases
	const vaguePhrases = ["write clean code", "follow best practices", "ensure proper", "be careful"];
	for (const phrase of vaguePhrases) {
		if (lower.includes(phrase)) {
			score -= 0.05;
		}
	}

	// Has bullet points (structured)
	const bulletLines = config.split("\n").filter((l) => l.trim().startsWith("-")).length;
	if (bulletLines > 5) {
		score += 0.05;
	}

	return Math.max(0.1, Math.min(1, score));
}

/**
 * Determine if agent succeeds on a task based on config quality.
 *
 * Higher config quality → guaranteed more successes.
 * Harder tasks → higher quality threshold required.
 *
 * Uses fixed thresholds per task (deterministic, quality-monotonic).
 */
function simulateOutcome(configQuality: number, task: Task): "success" | "failure" | "timeout" {
	// Each task has a quality threshold for success
	// Higher difficulty → higher threshold
	const threshold = 0.25 + task.difficulty * 0.4;

	if (configQuality >= threshold) {
		return "success";
	}
	return task.difficulty > 0.6 ? "timeout" : "failure";
}

/**
 * Generate tool sequence based on config quality.
 *
 * Better configs → agent follows expected sequence (fewer wasted steps).
 * Worse configs → agent adds exploration, repeated reads, etc.
 */
function generateSteps(configQuality: number, task: Task): TrajectoryStep[] {
	const steps: TrajectoryStep[] = [];
	let stepIndex = 0;

	// Agent might add extra exploration if config is poor
	const explorationCount = Math.round((1 - configQuality) * 3);

	for (let i = 0; i < explorationCount; i++) {
		steps.push({
			index: stepIndex++,
			type: "tool_call",
			content: "Glob",
			toolName: "Glob",
			tokens: 200,
		});
	}

	// Agent might re-read files if config is poor
	const rereadCount = Math.round((1 - configQuality) * 2);

	// Follow expected sequence
	for (let i = 0; i < task.expectedTools.length; i++) {
		const tool = task.expectedTools[i]!;

		// Add the expected tool call
		steps.push({
			index: stepIndex++,
			type: "tool_call",
			content: tool,
			toolName: tool,
			tokens: Math.round(task.baseTokens / task.expectedTools.length),
		});

		// Add re-read if config is poor and this is a Read tool
		if (tool === "Read" && rereadCount > 0 && i > 0) {
			for (let j = 0; j < rereadCount; j++) {
				steps.push({
					index: stepIndex++,
					type: "tool_call",
					content: "Read",
					toolName: "Read",
					tokens: 300,
				});
			}
		}

		// Add observation step
		steps.push({
			index: stepIndex++,
			type: "observation",
			content: `Executed ${tool}`,
			tokens: 100,
		});
	}

	return steps;
}

/**
 * Calculate total tokens from steps.
 */
function calculateTokens(steps: TrajectoryStep[]): number {
	return steps.reduce((sum, s) => sum + s.tokens, 0);
}

/**
 * Run agent on a single task with given config.
 *
 * Returns a Trajectory.
 */
function runTask(config: string, configQuality: number, task: Task): Trajectory {
	const outcome = simulateOutcome(configQuality, task);
	const steps = generateSteps(configQuality, task);
	const tokensUsed = calculateTokens(steps);

	return {
		id: randomUUID(),
		sessionId: `task-${task.id}`,
		configHash: createHash("sha256").update(config).digest("hex").slice(0, 12),
		steps,
		outcome,
		score: 0, // Will be computed by eval engine
		tokensUsed,
		timestamp: Date.now(),
	};
}

/**
 * Run agent on all fixed tasks with given config.
 *
 * Returns array of Trajectories — one per task.
 * Same tasks every time. Deterministic.
 */
export function runAgent(config: string): Trajectory[] {
	const configQuality = evaluateConfigQuality(config);

	return FIXED_TASKS.map((task) => runTask(config, configQuality, task));
}

/**
 * Get config quality score (for debugging).
 */
export function getConfigQuality(config: string): number {
	return evaluateConfigQuality(config);
}
