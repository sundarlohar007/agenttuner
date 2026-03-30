import { existsSync } from "node:fs";
import { getClaudeBaseDir, getCodexBaseDir, getCursorBaseDir } from "../utils/fs.js";
import { collectClaudeSessions } from "./claude-code.js";
import { collectCodexSessions } from "./codex.js";
import { collectCursorSessions } from "./cursor.js";
import type { AgentPaths, AgentType, UnifiedSession } from "./types.js";

export function detectAgents(): AgentPaths[] {
	return [
		{
			agent: "claude-code" as AgentType,
			baseDir: getClaudeBaseDir(),
			exists: existsSync(getClaudeBaseDir()),
		},
		{
			agent: "cursor" as AgentType,
			baseDir: getCursorBaseDir(),
			exists: existsSync(getCursorBaseDir()),
		},
		{
			agent: "codex" as AgentType,
			baseDir: getCodexBaseDir(),
			exists: existsSync(getCodexBaseDir()),
		},
	];
}

export async function collectAllSessions(agents?: AgentType[]): Promise<UnifiedSession[]> {
	const targetAgents = agents ?? (["claude-code", "cursor", "codex"] as AgentType[]);
	const sessions: UnifiedSession[] = [];

	const collectors: Record<AgentType, () => Promise<UnifiedSession[]>> = {
		"claude-code": collectClaudeSessions,
		cursor: collectCursorSessions,
		codex: collectCodexSessions,
	};

	for (const agent of targetAgents) {
		try {
			const agentSessions = await collectors[agent]();
			sessions.push(...agentSessions);
		} catch {
			// Skip agents that fail to collect
		}
	}

	return sessions;
}

export type { AgentType, ToolCall, UnifiedMessage, UnifiedSession } from "./types.js";
