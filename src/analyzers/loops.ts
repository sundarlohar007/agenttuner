import type { ToolCall, UnifiedSession } from "../collectors/types.js";
import type { WastePattern } from "./types.js";

/**
 * Detect repeated file reads of the same file within a session.
 */
export function detectRepeatedReads(session: UnifiedSession): WastePattern | null {
	const readCounts = new Map<string, number[]>();
	const locations: { turn: number; detail: string }[] = [];

	session.messages.forEach((msg, index) => {
		if (!msg.toolCalls) return;
		for (const tc of msg.toolCalls) {
			if (tc.name === "Read" || tc.name === "read_file") {
				const filePath = (tc.input.file_path as string) || (tc.input.path as string) || "";
				if (!filePath) continue;
				if (!readCounts.has(filePath)) readCounts.set(filePath, []);
				readCounts.get(filePath)!.push(index);
			}
		}
	});

	let totalRepeatedReads = 0;
	for (const [filePath, turns] of readCounts) {
		if (turns.length > 2) {
			totalRepeatedReads += turns.length - 1;
			for (const turn of turns.slice(1)) {
				locations.push({
					turn,
					detail: `Re-read ${filePath} (read ${turns.length} times total)`,
				});
			}
		}
	}

	if (totalRepeatedReads === 0) return null;

	// Estimate ~500 tokens per unnecessary file read (context + output)
	const estimatedTokens = totalRepeatedReads * 500;

	return {
		type: "repeated-read",
		severity: totalRepeatedReads > 5 ? "high" : totalRepeatedReads > 2 ? "medium" : "low",
		description: `${totalRepeatedReads} repeated file reads detected`,
		occurrences: totalRepeatedReads,
		estimatedWastedTokens: estimatedTokens,
		locations,
		fixSuggestion:
			'Add to CLAUDE.md: "Cache file contents mentally. Re-read files only if they may have changed."',
	};
}

/**
 * Detect repeated execution of the same command with the same result.
 */
export function detectRepeatedCommands(session: UnifiedSession): WastePattern | null {
	const commandOutputs = new Map<string, { count: number; turns: number[] }>();
	const locations: { turn: number; detail: string }[] = [];

	session.messages.forEach((msg, index) => {
		if (!msg.toolCalls) return;
		for (const tc of msg.toolCalls) {
			if (tc.name === "Bash" || tc.name === "exec_command") {
				const cmd = (tc.input.command as string) || "";
				if (!cmd) continue;
				const key = cmd.trim();
				if (!commandOutputs.has(key)) commandOutputs.set(key, { count: 0, turns: [] });
				const entry = commandOutputs.get(key)!;
				entry.count++;
				entry.turns.push(index);
			}
		}
	});

	let totalRepeats = 0;
	for (const [cmd, data] of commandOutputs) {
		if (data.count > 2) {
			totalRepeats += data.count - 1;
			for (const turn of data.turns.slice(1)) {
				locations.push({
					turn,
					detail: `Repeated: ${cmd.slice(0, 80)}`,
				});
			}
		}
	}

	if (totalRepeats === 0) return null;

	const estimatedTokens = totalRepeats * 300;

	return {
		type: "repeated-command",
		severity: totalRepeats > 5 ? "high" : totalRepeats > 2 ? "medium" : "low",
		description: `${totalRepeats} repeated command executions`,
		occurrences: totalRepeats,
		estimatedWastedTokens: estimatedTokens,
		locations,
		fixSuggestion:
			'Add to CLAUDE.md: "Run commands once. If a command fails, analyze the output before retrying."',
	};
}

/**
 * Detect tool calls with empty or minimal results (exploration waste).
 */
export function detectEmptyResults(session: UnifiedSession): WastePattern | null {
	let emptyCount = 0;
	const locations: { turn: number; detail: string }[] = [];

	session.messages.forEach((msg, index) => {
		if (!msg.toolCalls) return;
		for (const tc of msg.toolCalls) {
			if (tc.output !== undefined) {
				const outputLen = typeof tc.output === "string" ? tc.output.length : 0;
				if (outputLen === 0 && tc.name !== "Write" && tc.name !== "Edit") {
					emptyCount++;
					locations.push({
						turn: index,
						detail: `Empty result from ${tc.name}`,
					});
				}
			}
		}
	});

	if (emptyCount === 0) return null;

	return {
		type: "empty-tool-result",
		severity: emptyCount > 5 ? "medium" : "low",
		description: `${emptyCount} tool calls returned empty results`,
		occurrences: emptyCount,
		estimatedWastedTokens: emptyCount * 200,
		locations,
		fixSuggestion:
			'Add to CLAUDE.md: "Verify paths and commands exist before running. Check `ls` or `pwd` first."',
	};
}

/**
 * Detect large tool outputs that were likely ignored (no follow-up action).
 */
export function detectLargeIgnoredOutputs(session: UnifiedSession): WastePattern | null {
	let ignoredCount = 0;
	const locations: { turn: number; detail: string }[] = [];
	const LARGE_OUTPUT_THRESHOLD = 5000; // characters

	session.messages.forEach((msg, index) => {
		if (!msg.toolCalls) return;
		for (const tc of msg.toolCalls) {
			if (tc.output && typeof tc.output === "string" && tc.output.length > LARGE_OUTPUT_THRESHOLD) {
				// Check if the next assistant message references the output
				const nextAssistant = session.messages.slice(index + 1).find((m) => m.role === "assistant");
				if (nextAssistant && nextAssistant.content.length < 100) {
					// Short response to a large output = likely ignored
					ignoredCount++;
					locations.push({
						turn: index,
						detail: `${tc.name} returned ${tc.output.length} chars, mostly ignored`,
					});
				}
			}
		}
	});

	if (ignoredCount === 0) return null;

	return {
		type: "large-output-ignored",
		severity: ignoredCount > 3 ? "high" : "medium",
		description: `${ignoredCount} large tool outputs were largely ignored`,
		occurrences: ignoredCount,
		estimatedWastedTokens: ignoredCount * 2000,
		locations,
		fixSuggestion:
			'Add to CLAUDE.md: "Use targeted reads (with offset/limit) instead of reading entire files. Pipe commands through head/tail for large outputs."',
	};
}

/**
 * Run all loop/waste detectors on a session.
 */
export function detectAllPatterns(session: UnifiedSession): WastePattern[] {
	const patterns: WastePattern[] = [];

	const repeatedReads = detectRepeatedReads(session);
	if (repeatedReads) patterns.push(repeatedReads);

	const repeatedCommands = detectRepeatedCommands(session);
	if (repeatedCommands) patterns.push(repeatedCommands);

	const emptyResults = detectEmptyResults(session);
	if (emptyResults) patterns.push(emptyResults);

	const largeIgnored = detectLargeIgnoredOutputs(session);
	if (largeIgnored) patterns.push(largeIgnored);

	return patterns;
}
