import type { UnifiedSession } from "../collectors/types.js";
import type { WastePattern } from "./types.js";

/**
 * Detect "exploration loops" — agent reading multiple files in a directory
 * that don't seem related to the actual task.
 */
export function detectExplorationLoops(session: UnifiedSession): WastePattern | null {
	const dirAccess = new Map<string, number>();
	const locations: { turn: number; detail: string }[] = [];

	session.messages.forEach((msg, index) => {
		if (!msg.toolCalls) return;
		for (const tc of msg.toolCalls) {
			if (tc.name === "Glob" || tc.name === "Grep" || tc.name === "Bash") {
				const cmd = (tc.input.command as string) || (tc.input.pattern as string) || "";
				if (cmd.includes("ls") || cmd.includes("find") || tc.name === "Glob") {
					// Track directory exploration turns
					const dir = (tc.input.path as string) || ".";
					if (!dirAccess.has(dir)) dirAccess.set(dir, 0);
					dirAccess.set(dir, dirAccess.get(dir)! + 1);
				}
			}
		}
	});

	// Count exploration-heavy turns (>3 Glob/ls/Grep in one turn)
	let explorationTurns = 0;
	session.messages.forEach((msg, index) => {
		if (!msg.toolCalls) return;
		const exploreTools = msg.toolCalls.filter(
			(tc) =>
				tc.name === "Glob" ||
				tc.name === "Grep" ||
				(tc.name === "Bash" &&
					((tc.input.command as string) || "").match(/\b(ls|find|tree|dir)\b/)),
		);
		if (exploreTools.length >= 3) {
			explorationTurns++;
			locations.push({
				turn: index,
				detail: `${exploreTools.length} exploration tools in one turn`,
			});
		}
	});

	if (explorationTurns === 0) return null;

	return {
		type: "exploration-loop",
		severity: explorationTurns > 3 ? "high" : explorationTurns > 1 ? "medium" : "low",
		description: `${explorationTurns} turns spent heavily exploring directories`,
		occurrences: explorationTurns,
		estimatedWastedTokens: explorationTurns * 1500,
		locations,
		fixSuggestion:
			'Add to CLAUDE.md: "Start by reading the main entry point. Avoid broad directory exploration — use specific file paths."',
	};
}

/**
 * Detect file churn — agent creating and then immediately deleting/modifying files.
 */
export function detectFileChurn(session: UnifiedSession): WastePattern | null {
	const fileActions = new Map<string, Array<{ action: string; turn: number }>>();

	session.messages.forEach((msg, index) => {
		if (!msg.toolCalls) return;
		for (const tc of msg.toolCalls) {
			if (tc.name === "Write") {
				const filePath = (tc.input.file_path as string) || (tc.input.path as string) || "";
				if (!filePath) continue;
				if (!fileActions.has(filePath)) fileActions.set(filePath, []);
				fileActions.get(filePath)!.push({ action: "write", turn: index });
			} else if (tc.name === "Edit") {
				const filePath = (tc.input.file_path as string) || (tc.input.path as string) || "";
				if (!filePath) continue;
				if (!fileActions.has(filePath)) fileActions.set(filePath, []);
				fileActions.get(filePath)!.push({ action: "edit", turn: index });
			}
		}
	});

	let churnCount = 0;
	const locations: { turn: number; detail: string }[] = [];

	for (const [filePath, actions] of fileActions) {
		// Detect write + edit within 2 turns (agent wrote wrong, had to fix)
		for (let i = 0; i < actions.length - 1; i++) {
			const current = actions[i]!;
			const next = actions[i + 1]!;
			if (current.action === "write" && next.action === "edit" && next.turn - current.turn <= 2) {
				churnCount++;
				locations.push({
					turn: next.turn,
					detail: `Wrote then immediately edited ${filePath}`,
				});
			}
		}
	}

	if (churnCount === 0) return null;

	return {
		type: "file-churn",
		severity: churnCount > 3 ? "high" : "medium",
		description: `${churnCount} files were written then immediately edited`,
		occurrences: churnCount,
		estimatedWastedTokens: churnCount * 800,
		locations,
		fixSuggestion:
			'Add to CLAUDE.md: "Plan file contents mentally before writing. Review the full file content before using the Write tool."',
	};
}

/**
 * Detect idle/low-value turns where the agent produces minimal output
 * without meaningful tool calls.
 */
export function detectIdleTurns(session: UnifiedSession): WastePattern | null {
	let idleCount = 0;
	const locations: { turn: number; detail: string }[] = [];

	session.messages.forEach((msg, index) => {
		if (msg.role !== "assistant") return;
		const hasToolCalls = msg.toolCalls && msg.toolCalls.length > 0;
		const contentShort = msg.content.length < 50;
		const tokenUsage = msg.tokenUsage;

		// Idle = short response, no tools, but still used tokens
		if (!hasToolCalls && contentShort && tokenUsage && tokenUsage.output > 0) {
			idleCount++;
			locations.push({
				turn: index,
				detail: `Short response (${msg.content.length} chars) with ${tokenUsage.output} output tokens`,
			});
		}
	});

	if (idleCount === 0) return null;

	return {
		type: "idle-turn",
		severity: idleCount > 5 ? "medium" : "low",
		description: `${idleCount} low-value turns with minimal output`,
		occurrences: idleCount,
		estimatedWastedTokens: idleCount * 150,
		locations,
		fixSuggestion: "Consider combining related asks into single prompts to reduce overhead turns.",
	};
}

/**
 * Run all waste detectors on a session.
 */
export function detectAllWastePatterns(session: UnifiedSession): WastePattern[] {
	const patterns: WastePattern[] = [];

	const exploration = detectExplorationLoops(session);
	if (exploration) patterns.push(exploration);

	const churn = detectFileChurn(session);
	if (churn) patterns.push(churn);

	const idle = detectIdleTurns(session);
	if (idle) patterns.push(idle);

	return patterns;
}
