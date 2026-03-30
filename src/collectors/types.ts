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

export const AGENT_TYPES = [
	"claude-code",
	"cursor",
	"codex",
	"windsurf",
	"gemini",
	"aider",
	"cline",
	"opencode",
	"copilot",
	"antigravity",
] as const;

export type AgentType = (typeof AGENT_TYPES)[number];

export interface UnifiedSession {
	agent: AgentType;
	sessionId: string;
	projectPath: string;
	startTime: string;
	endTime: string;
	messages: UnifiedMessage[];
	totalInputTokens: number;
	totalOutputTokens: number;
}

export interface AgentPaths {
	agent: AgentType;
	baseDir: string;
	exists: boolean;
}
