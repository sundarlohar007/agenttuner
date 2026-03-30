import { readdirSync } from "node:fs";
import { join } from "node:path";
import { getAiderBaseDir, findJsonFiles, findYamlFiles, readFileContent } from "../utils/fs.js";
import type { UnifiedSession, UnifiedMessage, ToolCall } from "./types.js";

interface AiderChatEntry {
	role?: string;
	content?: string;
	timestamp?: string;
	function_call?: { name: string; arguments?: string };
	tool_calls?: Array<{ function: { name: string; arguments?: string } }>;
	usage?: { prompt_tokens?: number; completion_tokens?: number };
}

function parseAiderChatHistory(filePath: string): UnifiedSession | null {
	try {
		const content = readFileContent(filePath);
		let entries: AiderChatEntry[];

		if (filePath.endsWith(".json")) {
			const parsed = JSON.parse(content);
			entries = Array.isArray(parsed) ? parsed : parsed.messages ?? parsed.history ?? [parsed];
		} else {
			// Try parsing as line-delimited JSON
			entries = content
				.split("\n")
				.filter((l) => l.trim())
				.map((l) => JSON.parse(l));
		}

		if (entries.length === 0) return null;

		const messages: UnifiedMessage[] = [];
		let sessionId = "";
		let projectPath = "";
		let startTime = "";
		let endTime = "";
		let totalInputTokens = 0;
		let totalOutputTokens = 0;

		for (const entry of entries) {
			const role = entry.role ?? "assistant";
			const timestamp = entry.timestamp ?? new Date().toISOString();

			if (!startTime) startTime = timestamp;
			endTime = timestamp;

			if (entry.usage) {
				totalInputTokens += entry.usage.prompt_tokens ?? 0;
				totalOutputTokens += entry.usage.completion_tokens ?? 0;
			}

			const toolCalls: ToolCall[] = [];

			if (entry.function_call) {
				let input: Record<string, unknown> = {};
				try {
					input = JSON.parse(entry.function_call.arguments ?? "{}");
				} catch {
					input = { raw: entry.function_call.arguments };
				}
				toolCalls.push({
					name: entry.function_call.name,
					input,
				});
			}

			if (entry.tool_calls) {
				for (const tc of entry.tool_calls) {
					let input: Record<string, unknown> = {};
					try {
						input = JSON.parse(tc.function.arguments ?? "{}");
					} catch {
						input = { raw: tc.function.arguments };
					}
					toolCalls.push({
						name: tc.function.name,
						input,
					});
				}
			}

			messages.push({
				role: role === "user" || role === "assistant" || role === "system" ? role : "assistant",
				content: entry.content ?? "",
				timestamp,
				toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
				tokenUsage: entry.usage
					? {
							input: entry.usage.prompt_tokens ?? 0,
							output: entry.usage.completion_tokens ?? 0,
						}
					: undefined,
			});
		}

		if (!sessionId) {
			sessionId = filePath.split(/[/\\]/).pop()?.replace(/\.(json|yml|yaml)$/, "") ?? "unknown";
		}

		return {
			agent: "aider",
			sessionId,
			projectPath,
			startTime,
			endTime,
			messages,
			totalInputTokens,
			totalOutputTokens,
		};
	} catch {
		return null;
	}
}

export async function collectAiderSessions(): Promise<UnifiedSession[]> {
	const baseDir = getAiderBaseDir();
	const sessions: UnifiedSession[] = [];

	const historyDirs = [
		join(baseDir, "history"),
		join(baseDir, "sessions"),
		join(baseDir, ".aider.tags.cache"),
	];

	for (const historyDir of historyDirs) {
		const jsonFiles = findJsonFiles(historyDir);
		for (const filePath of jsonFiles) {
			const session = parseAiderChatHistory(filePath);
			if (session && session.messages.length > 0) {
				sessions.push(session);
			}
		}
	}

	return sessions;
}
