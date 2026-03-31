import type { Trajectory, Pattern } from "../core/types.js";

/**
 * Extract patterns from high-scoring trajectories.
 *
 * Rules:
 * - Only use trajectories with score > 0.7
 * - Extract tool sequences (tool_call chains)
 * - Count frequency
 * - Return top patterns sorted by impact
 */
export function extractPatterns(trajectories: Trajectory[]): Pattern[] {
	// Filter high-scoring trajectories
	const good = trajectories.filter((t) => t.score > 0.7);

	if (good.length === 0) return [];

	// Extract tool sequences
	const sequences = new Map<string, { count: number; successCount: number }>();

	for (const t of good) {
		const toolChain = t.steps
			.filter((s) => s.type === "tool_call" && s.toolName)
			.map((s) => s.toolName!)
			.join(" → ");

		if (toolChain.length > 0 && toolChain.includes("→")) {
			const entry = sequences.get(toolChain) ?? { count: 0, successCount: 0 };
			entry.count++;
			if (t.outcome === "success") entry.successCount++;
			sequences.set(toolChain, entry);
		}
	}

	// Convert to patterns, filter by minimum frequency
	const patterns: Pattern[] = Array.from(sequences.entries())
		.filter(([_, data]) => data.count >= 2)
		.map(([pattern, data]) => ({
			pattern,
			type: "tool-sequence" as const,
			successRate: Math.round((data.successCount / data.count) * 100) / 100,
			frequency: data.count,
		}));

	// Sort by impact (frequency * successRate)
	patterns.sort((a, b) => b.frequency * b.successRate - a.frequency * a.successRate);

	return patterns.slice(0, 10);
}
