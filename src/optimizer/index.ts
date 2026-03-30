import { readFileSync, writeFileSync } from "node:fs";
import type { WastePattern } from "../analyzers/types.js";
import type { ConfigIssue } from "../diagnostics/types.js";
import { countChanges, generateDiff } from "./diff.js";
import { buildOptimizationPrompt, OPTIMIZER_SYSTEM_PROMPT } from "./prompts.js";

export interface OptimizeResult {
	original: string;
	optimized: string;
	diff: string;
	changes: { added: number; removed: number };
}

/**
 * Try to call an LLM API to optimize the config.
 * Falls back to rule-based optimization if no API key is available.
 */
export async function optimizeConfig(
	filePath: string,
	issues: ConfigIssue[],
	wastePatterns: WastePattern[],
): Promise<OptimizeResult> {
	const original = readFileSync(filePath, "utf-8");

	// Format issues and waste patterns for the prompt
	const issuesText = issues
		.map((i) => `- [${i.severity}] ${i.message} → ${i.suggestion}`)
		.join("\n");

	const wasteText = wastePatterns
		.map(
			(w) =>
				`- ${w.type}: ${w.description} (${w.occurrences}x, ~${w.estimatedWastedTokens} wasted tokens) → ${w.fixSuggestion}`,
		)
		.join("\n");

	const optimized = await tryLlmOptimization(original, issuesText, wasteText);
	const diff = generateDiff(original, optimized, filePath);
	const changes = countChanges(diff);

	return { original, optimized, diff, changes };
}

/**
 * Attempt LLM-based optimization using available API keys.
 */
async function tryLlmOptimization(
	currentConfig: string,
	issuesText: string,
	wasteText: string,
): Promise<string> {
	const prompt = buildOptimizationPrompt(currentConfig, issuesText, wasteText);

	// Try Anthropic API
	const anthropicKey = process.env["ANTHROPIC_API_KEY"];
	if (anthropicKey) {
		try {
			const response = await fetch("https://api.anthropic.com/v1/messages", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-api-key": anthropicKey,
					"anthropic-version": "2023-06-01",
				},
				body: JSON.stringify({
					model: "claude-sonnet-4-20250514",
					max_tokens: 2000,
					system: OPTIMIZER_SYSTEM_PROMPT,
					messages: [{ role: "user", content: prompt }],
				}),
			});

			if (response.ok) {
				const data = (await response.json()) as {
					content: Array<{ type: string; text: string }>;
				};
				const text = data.content
					.filter((c) => c.type === "text")
					.map((c) => c.text)
					.join("");
				if (text.trim()) return text.trim();
			}
		} catch {
			// Fall through to rule-based
		}
	}

	// Try OpenAI API
	const openaiKey = process.env["OPENAI_API_KEY"];
	if (openaiKey) {
		try {
			const response = await fetch("https://api.openai.com/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${openaiKey}`,
				},
				body: JSON.stringify({
					model: "gpt-4o",
					max_tokens: 2000,
					messages: [
						{ role: "system", content: OPTIMIZER_SYSTEM_PROMPT },
						{ role: "user", content: prompt },
					],
				}),
			});

			if (response.ok) {
				const data = (await response.json()) as {
					choices: Array<{ message: { content: string } }>;
				};
				const text = data.choices[0]?.message?.content;
				if (text?.trim()) return text.trim();
			}
		} catch {
			// Fall through to rule-based
		}
	}

	// Fallback: rule-based optimization
	return ruleBasedOptimization(currentConfig, issuesText, wasteText);
}

/**
 * Simple rule-based optimization when no LLM is available.
 */
function ruleBasedOptimization(
	currentConfig: string,
	_issuesText: string,
	wasteText: string,
): string {
	const lines = currentConfig.split("\n");
	const optimized: string[] = [];

	// Keep headers and bullet points, remove prose
	for (const line of lines) {
		const trimmed = line.trim();
		// Keep headers
		if (trimmed.startsWith("#")) {
			optimized.push(line);
			continue;
		}
		// Keep bullet points and commands
		if (trimmed.startsWith("-") || trimmed.startsWith("*") || /`[^`]+`/.test(trimmed)) {
			// Replace ALWAYS/NEVER
			let processed = line;
			processed = processed.replace(/\bALWAYS\b/g, "Prefer to");
			processed = processed.replace(/\bNEVER\b/g, "Avoid");
			optimized.push(processed);
			continue;
		}
		// Skip long prose lines
		if (trimmed.length > 100 && !trimmed.startsWith("#")) {
			continue;
		}
		// Keep short lines
		if (trimmed.length > 0) {
			optimized.push(line);
		}
	}

	// Add missing critical sections based on waste analysis
	const hasWasteSection = optimized.some((l) => l.toLowerCase().includes("pitfall"));
	if (!hasWasteSection && wasteText) {
		optimized.push("");
		optimized.push("## Common Pitfalls");
		// Extract key waste patterns as pitfalls
		const patterns = wasteText.split("\n").filter((l) => l.startsWith("-"));
		for (const pattern of patterns.slice(0, 5)) {
			optimized.push(pattern);
		}
	}

	return optimized.join("\n");
}

export { countChanges, generateDiff } from "./diff.js";
