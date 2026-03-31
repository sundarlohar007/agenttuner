/**
 * Fixed task set for deterministic agent evaluation.
 *
 * Each task defines:
 * - expected tool sequence (optimal path)
 * - base token cost
 * - difficulty multiplier
 *
 * The executor uses these to simulate agent behavior.
 * Better configs produce trajectories closer to expected sequences.
 */
export interface Task {
	id: string;
	name: string;
	expectedTools: string[];
	baseTokens: number;
	difficulty: number; // 0-1, higher = harder
}

/**
 * Fixed task set — same tasks every iteration.
 * No randomness. Deterministic.
 */
export const FIXED_TASKS: Task[] = [
	{
		id: "read-analyze-edit",
		name: "Read file, analyze, edit",
		expectedTools: ["Read", "Grep", "Edit"],
		baseTokens: 2000,
		difficulty: 0.3,
	},
	{
		id: "explore-fix-test",
		name: "Explore codebase, fix bug, run tests",
		expectedTools: ["Glob", "Read", "Edit", "Bash"],
		baseTokens: 3500,
		difficulty: 0.5,
	},
	{
		id: "refactor-module",
		name: "Refactor a module",
		expectedTools: ["Read", "Read", "Edit", "Edit", "Bash"],
		baseTokens: 4000,
		difficulty: 0.6,
	},
	{
		id: "add-feature",
		name: "Add new feature",
		expectedTools: ["Glob", "Read", "Write", "Edit", "Bash"],
		baseTokens: 5000,
		difficulty: 0.7,
	},
	{
		id: "debug-failure",
		name: "Debug test failure",
		expectedTools: ["Bash", "Read", "Grep", "Edit", "Bash"],
		baseTokens: 3000,
		difficulty: 0.4,
	},
];
