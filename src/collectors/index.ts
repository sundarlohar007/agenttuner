import { existsSync } from "node:fs";
import {
	getClaudeBaseDir,
	getCodexBaseDir,
	getCursorBaseDir,
	getWindsurfBaseDir,
	getGeminiBaseDir,
	getAiderBaseDir,
	getClineBaseDir,
	getOpenCodeBaseDir,
	getCopilotBaseDir,
	getAntigravityBaseDir,
} from "../utils/fs.js";
import { collectClaudeSessions } from "./claude-code.js";
import { collectCodexSessions } from "./codex.js";
import { collectCursorSessions } from "./cursor.js";
import { collectWindsurfSessions } from "./windsurf.js";
import { collectGeminiSessions } from "./gemini.js";
import { collectAiderSessions } from "./aider.js";
import { collectClineSessions } from "./cline.js";
import { collectOpenCodeSessions } from "./opencode.js";
import { collectCopilotSessions } from "./copilot.js";
import { collectAntigravitySessions } from "./antigravity.js";
import type { AgentPaths, AgentType, UnifiedSession } from "./types.js";
import { AGENT_TYPES } from "./types.js";

const AGENT_BASE_DIRS: Record<AgentType, () => string> = {
	"claude-code": getClaudeBaseDir,
	cursor: getCursorBaseDir,
	codex: getCodexBaseDir,
	windsurf: getWindsurfBaseDir,
	gemini: getGeminiBaseDir,
	aider: getAiderBaseDir,
	cline: getClineBaseDir,
	opencode: getOpenCodeBaseDir,
	copilot: getCopilotBaseDir,
	antigravity: getAntigravityBaseDir,
};

export function detectAgents(): AgentPaths[] {
	return AGENT_TYPES.map((agent) => {
		const baseDir = AGENT_BASE_DIRS[agent]();
		return {
			agent,
			baseDir,
			exists: existsSync(baseDir),
		};
	});
}

export async function collectAllSessions(agents?: AgentType[]): Promise<UnifiedSession[]> {
	const targetAgents = agents ?? [...AGENT_TYPES];
	const sessions: UnifiedSession[] = [];

	const collectors: Record<AgentType, () => Promise<UnifiedSession[]>> = {
		"claude-code": collectClaudeSessions,
		cursor: collectCursorSessions,
		codex: collectCodexSessions,
		windsurf: collectWindsurfSessions,
		gemini: collectGeminiSessions,
		aider: collectAiderSessions,
		cline: collectClineSessions,
		opencode: collectOpenCodeSessions,
		copilot: collectCopilotSessions,
		antigravity: collectAntigravitySessions,
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

export { AGENT_TYPES };
export type { AgentType, ToolCall, UnifiedMessage, UnifiedSession } from "./types.js";
