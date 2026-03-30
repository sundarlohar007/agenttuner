import { readFileSync } from "node:fs";
import type { WastePattern } from "../analyzers/types.js";
import type { ConfigIssue } from "../diagnostics/types.js";
import { countChanges, generateDiff } from "./diff.js";
import { advancedRuleBasedOptimization, getOptimizationStats } from "./rules-engine.js";
import { tryOllamaOptimization, isOllamaRunning, getOllamaStatus } from "./ollama.js";
import { buildOptimizationPrompt, OPTIMIZER_SYSTEM_PROMPT } from "./prompts.js";

export type OptimizationEngine = "rules" | "ollama" | "anthropic" | "openai";

export interface OptimizeOptions {
	engine?: OptimizationEngine;
}

export interface OptimizeResult {
	original: string;
	optimized: string;
	diff: string;
	changes: { added: number; removed: number };
	engine: OptimizationEngine;
	stats: {
		vaguePatternsRemoved: number;
		absolutesRewritten: number;
		linesAdded: number;
		linesRemoved: number;
	};
}

/**
 * Optimize a config file using the specified engine.
 */
export async function optimizeConfig(
	filePath: string,
	issues: ConfigIssue[],
	wastePatterns: WastePattern[],
	options: OptimizeOptions = {},
): Promise<OptimizeResult> {
	const original = readFileSync(filePath, "utf-8");

	const issuesText = issues
		.map((i) => `- [${i.severity}] ${i.message} → ${i.suggestion}`)
		.join("\n");

	const wasteText = wastePatterns
		.map(
			(w) =>
				`- ${w.type}: ${w.description} (${w.occurrences}x, ~${w.estimatedWastedTokens} wasted tokens) → ${w.fixSuggestion}`,
		)
		.join("\n");

	let optimized: string;
	let engine: OptimizationEngine = options.engine ?? "rules";

	switch (options.engine) {
		case "ollama": {
			const ollamaResult = await tryOllamaOptimization(original, issuesText, wasteText);
			if (ollamaResult) {
				optimized = ollamaResult;
				engine = "ollama";
			} else {
				optimized = advancedRuleBasedOptimization(original, issues, wastePatterns);
				engine = "rules";
			}
			break;
		}
		case "anthropic": {
			const anthropicResult = await tryAnthropicOptimization(original, issuesText, wasteText);
			if (anthropicResult) {
				optimized = anthropicResult;
				engine = "anthropic";
			} else {
				optimized = advancedRuleBasedOptimization(original, issues, wastePatterns);
				engine = "rules";
			}
			break;
		}
		case "openai": {
			const openaiResult = await tryOpenAIOptimization(original, issuesText, wasteText);
			if (openaiResult) {
				optimized = openaiResult;
				engine = "openai";
			} else {
				optimized = advancedRuleBasedOptimization(original, issues, wastePatterns);
				engine = "rules";
			}
			break;
		}
		default:
			optimized = advancedRuleBasedOptimization(original, issues, wastePatterns);
			engine = "rules";
			break;
	}

	const diff = generateDiff(original, optimized, filePath);
	const changes = countChanges(diff);
	const stats = getOptimizationStats(original, optimized);

	return { original, optimized, diff, changes, engine, stats };
}

/**
 * Try Anthropic API optimization.
 */
async function tryAnthropicOptimization(
	config: string,
	issuesText: string,
	wasteText: string,
): Promise<string | null> {
	const apiKey = process.env["ANTHROPIC_API_KEY"];
	if (!apiKey) return null;

	const prompt = buildOptimizationPrompt(config, issuesText, wasteText);

	try {
		const response = await fetch("https://api.anthropic.com/v1/messages", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": apiKey,
				"anthropic-version": "2023-06-01",
			},
			body: JSON.stringify({
				model: "claude-sonnet-4-20250514",
				max_tokens: 2000,
				system: OPTIMIZER_SYSTEM_PROMPT,
				messages: [{ role: "user", content: prompt }],
			}),
			signal: AbortSignal.timeout(30000),
		});

		if (!response.ok) return null;

		const data = (await response.json()) as {
			content: Array<{ type: string; text: string }>;
		};
		const text = data.content
			.filter((c) => c.type === "text")
			.map((c) => c.text)
			.join("");
		return text.trim() || null;
	} catch {
		return null;
	}
}

/**
 * Try OpenAI API optimization.
 */
async function tryOpenAIOptimization(
	config: string,
	issuesText: string,
	wasteText: string,
): Promise<string | null> {
	const apiKey = process.env["OPENAI_API_KEY"];
	if (!apiKey) return null;

	const prompt = buildOptimizationPrompt(config, issuesText, wasteText);

	try {
		const response = await fetch("https://api.openai.com/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: "gpt-4o",
				max_tokens: 2000,
				messages: [
					{ role: "system", content: OPTIMIZER_SYSTEM_PROMPT },
					{ role: "user", content: prompt },
				],
			}),
			signal: AbortSignal.timeout(30000),
		});

		if (!response.ok) return null;

		const data = (await response.json()) as {
			choices: Array<{ message: { content: string } }>;
		};
		const text = data.choices[0]?.message?.content;
		return text?.trim() || null;
	} catch {
		return null;
	}
}

/**
 * Detect the best available engine automatically.
 */
export async function detectBestEngine(): Promise<OptimizationEngine> {
	if (process.env["ANTHROPIC_API_KEY"]) return "anthropic";
	if (process.env["OPENAI_API_KEY"]) return "openai";
	if (await isOllamaRunning()) return "ollama";
	return "rules";
}

export { countChanges, generateDiff } from "./diff.js";
export { getOllamaStatus } from "./ollama.js";
export { getOptimizationStats } from "./rules-engine.js";
