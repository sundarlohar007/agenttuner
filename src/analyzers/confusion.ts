import type { UnifiedSession } from "../collectors/types.js";
import type { WastePattern } from "./types.js";

/**
 * Detect confusion patterns — agent creating files that might already exist,
 * using wrong commands, or showing signs of misunderstanding the project.
 */
export function detectConfusionPatterns(session: UnifiedSession): WastePattern | null {
	let confusionCount = 0;
	const locations: { turn: number; detail: string }[] = [];

	session.messages.forEach((msg, index) => {
		if (msg.role !== "assistant") return;

		// Detect "let me check" / "I need to understand" patterns
		// that indicate the agent doesn't know the project
		const confusionPhrases = [
			"let me check",
			"let me understand",
			"let me explore",
			"let me first",
			"I need to understand",
			"I'm not sure",
			"I'm confused",
			"could you clarify",
			"what do you mean",
			"which file",
			"where is",
		];

		const contentLower = msg.content.toLowerCase();
		for (const phrase of confusionPhrases) {
			if (contentLower.includes(phrase)) {
				confusionCount++;
				locations.push({
					turn: index,
					detail: `Confusion detected: "${phrase}"`,
				});
				break;
			}
		}
	});

	if (confusionCount === 0) return null;

	return {
		type: "exploration-loop",
		severity: confusionCount > 3 ? "high" : "medium",
		description: `${confusionCount} turns showing agent confusion about the project`,
		occurrences: confusionCount,
		estimatedWastedTokens: confusionCount * 1000,
		locations,
		fixSuggestion:
			"Add to CLAUDE.md: Architecture section describing project structure, key directories, and entry points.",
	};
}
