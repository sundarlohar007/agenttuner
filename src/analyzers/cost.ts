import type { UnifiedSession } from "../collectors/types.js";
import type { SessionAnalysis } from "./types.js";
import { COST_PER_INPUT_TOKEN, COST_PER_OUTPUT_TOKEN } from "./types.js";

/**
 * Analyze token usage and cost for a session.
 */
export function analyzeCosts(session: UnifiedSession): {
	totalInputTokens: number;
	totalOutputTokens: number;
	totalTokens: number;
	costEstimate: number;
	toolCallBreakdown: Record<string, number>;
	turnsWithNoTools: number;
	avgTokensPerTurn: number;
} {
	const toolCallBreakdown: Record<string, number> = {};
	let turnsWithNoTools = 0;
	let totalToolCalls = 0;

	for (const msg of session.messages) {
		if (msg.role !== "assistant") continue;

		if (!msg.toolCalls || msg.toolCalls.length === 0) {
			turnsWithNoTools++;
		} else {
			for (const tc of msg.toolCalls) {
				toolCallBreakdown[tc.name] = (toolCallBreakdown[tc.name] ?? 0) + 1;
				totalToolCalls++;
			}
		}
	}

	const totalTokens = session.totalInputTokens + session.totalOutputTokens;
	const assistantTurns = session.messages.filter((m) => m.role === "assistant").length;
	const costEstimate =
		session.totalInputTokens * COST_PER_INPUT_TOKEN +
		session.totalOutputTokens * COST_PER_OUTPUT_TOKEN;

	return {
		totalInputTokens: session.totalInputTokens,
		totalOutputTokens: session.totalOutputTokens,
		totalTokens,
		costEstimate,
		toolCallBreakdown,
		turnsWithNoTools,
		avgTokensPerTurn: assistantTurns > 0 ? Math.round(totalTokens / assistantTurns) : 0,
	};
}
