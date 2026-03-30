import type { UnifiedSession } from "../collectors/types.js";
import { detectConfusionPatterns } from "./confusion.js";
import { analyzeCosts } from "./cost.js";
import { detectAllPatterns } from "./loops.js";
import type { FullAnalysisResult, SessionAnalysis, WastePattern } from "./types.js";
import { COST_PER_INPUT_TOKEN, COST_PER_OUTPUT_TOKEN } from "./types.js";
import { detectAllWastePatterns } from "./waste.js";

export function analyzeSession(session: UnifiedSession): SessionAnalysis {
	const loopPatterns = detectAllPatterns(session);
	const wastePatterns = detectAllWastePatterns(session);
	const confusion = detectConfusionPatterns(session);
	const costData = analyzeCosts(session);

	const allPatterns: WastePattern[] = [...loopPatterns, ...wastePatterns];
	if (confusion) allPatterns.push(confusion);

	const estimatedWastedTokens = allPatterns.reduce((sum, p) => sum + p.estimatedWastedTokens, 0);

	return {
		sessionId: session.sessionId,
		agent: session.agent,
		projectPath: session.projectPath,
		totalTurns: session.messages.filter((m) => m.role === "assistant").length,
		totalTokens: costData.totalTokens,
		estimatedWastedTokens,
		wastePatterns: allPatterns,
		toolCallBreakdown: costData.toolCallBreakdown,
		costEstimate: costData.costEstimate,
	};
}

export function analyzeAllSessions(sessions: UnifiedSession[]): FullAnalysisResult {
	const sessionAnalyses = sessions.map(analyzeSession);

	const totalTokensUsed = sessionAnalyses.reduce((s, a) => s + a.totalTokens, 0);
	const estimatedWastedTokens = sessionAnalyses.reduce((s, a) => s + a.estimatedWastedTokens, 0);
	const estimatedWastedCost =
		estimatedWastedTokens * ((COST_PER_INPUT_TOKEN + COST_PER_OUTPUT_TOKEN) / 2);

	// Aggregate waste categories
	const categoryMap = new Map<string, { count: number; tokens: number }>();
	for (const analysis of sessionAnalyses) {
		for (const pattern of analysis.wastePatterns) {
			if (!categoryMap.has(pattern.type)) categoryMap.set(pattern.type, { count: 0, tokens: 0 });
			const entry = categoryMap.get(pattern.type)!;
			entry.count += pattern.occurrences;
			entry.tokens += pattern.estimatedWastedTokens;
		}
	}

	const topWasteCategories = Array.from(categoryMap.entries())
		.map(([type, data]) => ({ type, ...data }))
		.sort((a, b) => b.tokens - a.tokens);

	return {
		sessions: sessionAnalyses,
		totalSessions: sessions.length,
		totalTokensUsed,
		estimatedWastedTokens,
		estimatedWastedCost,
		topWasteCategories,
	};
}

export type {
	FullAnalysisResult,
	SessionAnalysis,
	WastePattern,
} from "./types.js";
