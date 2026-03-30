export interface ToolCall {
	name: string;
	input: Record<string, unknown>;
	output?: string;
	duration?: number;
}

export interface TokenUsage {
	input: number;
	output: number;
}

export interface UnifiedMessage {
	role: "user" | "assistant" | "system";
	content: string;
	timestamp: string;
	toolCalls?: ToolCall[];
	tokenUsage?: TokenUsage;
}

export interface UnifiedSession {
	agent: "claude-code" | "cursor" | "codex";
	sessionId: string;
	projectPath: string;
	startTime: string;
	endTime: string;
	messages: UnifiedMessage[];
	totalInputTokens: number;
	totalOutputTokens: number;
}

export type AgentType = "claude-code" | "cursor" | "codex";

export interface AgentPaths {
	agent: AgentType;
	baseDir: string;
	exists: boolean;
}
