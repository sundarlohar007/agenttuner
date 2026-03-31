export interface TrajectoryStep {
	index: number;
	type: "tool_call" | "tool_result" | "observation";
	content: string;
	toolName?: string;
	tokens: number;
}

export interface Trajectory {
	id: string;
	sessionId: string;
	configHash: string;
	steps: TrajectoryStep[];
	outcome: "success" | "failure" | "timeout";
	score: number;
	tokensUsed: number;
	timestamp: number;
}

export interface Iteration {
	id: string;
	iteration: number;
	configHash: string;
	configContent: string;
	avgScore: number;
	successRate: number;
	tokensUsed: number;
	mutations: string[];
	timestamp: number;
}

export interface Pattern {
	pattern: string;
	type: "tool-sequence";
	successRate: number;
	frequency: number;
}

export interface OptimizationResult {
	baselineScore: number;
	finalScore: number;
	improvement: number;
	bestConfig: string;
	topPatterns: Pattern[];
	iterations: Iteration[];
}
