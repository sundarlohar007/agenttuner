export interface WastePattern {
	type:
		| "repeated-read"
		| "repeated-command"
		| "exploration-loop"
		| "file-churn"
		| "idle-turn"
		| "empty-tool-result"
		| "large-output-ignored";
	severity: "low" | "medium" | "high";
	description: string;
	occurrences: number;
	estimatedWastedTokens: number;
	locations: { turn: number; detail: string }[];
	fixSuggestion: string;
}

export interface SessionAnalysis {
	sessionId: string;
	agent: string;
	projectPath: string;
	totalTurns: number;
	totalTokens: number;
	estimatedWastedTokens: number;
	wastePatterns: WastePattern[];
	toolCallBreakdown: Record<string, number>;
	costEstimate: number; // USD
}

export interface FullAnalysisResult {
	sessions: SessionAnalysis[];
	totalSessions: number;
	totalTokensUsed: number;
	estimatedWastedTokens: number;
	estimatedWastedCost: number;
	topWasteCategories: { type: string; count: number; tokens: number }[];
}

// Approximate cost per token (varies by model, using average)
export const COST_PER_INPUT_TOKEN = 0.000003; // $3 per 1M tokens
export const COST_PER_OUTPUT_TOKEN = 0.000015; // $15 per 1M tokens
