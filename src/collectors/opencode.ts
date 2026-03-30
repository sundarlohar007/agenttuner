import { join } from "node:path";
import { getOpenCodeBaseDir, findJsonFiles, findJsonlFiles, readFileContent } from "../utils/fs.js";
import type { UnifiedSession, UnifiedMessage, ToolCall } from "./types.js";

interface OpenCodeMessage {
	role?: string;
	content?: string;
	timestamp?: string;
	toolCalls?: Array<{ name: string; input: Record<string, unknown>; output?: string }>;
	usage?: { input?: number; output?: number; inputTokens?: number; outputTokens?: number };
}

function parseOpenCodeSession(filePath: string): UnifiedSession | null {
	try {
		const content = readFileContent(filePath);
		let entries: OpenCodeMessage[];

		if (filePath.endsWith(".jsonl")) {
			entries = content
				.split("\n")
				.filter((l) => l.trim())
				.map((l) => JSON.parse(l));
		} else {
			const parsed = JSON.parse(content);
			entries = Array.isArray(parsed)
				? parsed
				: parsed.messages ?? parsed.history ?? [parsed];
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
				totalInputTokens += entry.usage.input ?? entry.usage.inputTokens ?? 0;
				totalOutputTokens += entry.usage.output ?? entry.usage.outputTokens ?? 0;
			}

			const toolCalls: ToolCall[] | undefined = entry.toolCalls?.map(
				(tc: { name: string; input: Record<string, unknown>; output?: string }) => ({
					name: tc.name,
					input: tc.input ?? {},
					output: tc.output,
				}),
			);

			messages.push({
				role: role === "user" || role === "assistant" || role === "system" ? role : "assistant",
				content: entry.content ?? "",
				timestamp,
				toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
				tokenUsage: entry.usage
					? {
							input: entry.usage.input ?? entry.usage.inputTokens ?? 0,
							output: entry.usage.output ?? entry.usage.outputTokens ?? 0,
						}
					: undefined,
			});
		}

		if (!sessionId) {
			sessionId = filePath.split(/[/\\]/).pop()?.replace(/\.(json|jsonl)$/, "") ?? "unknown";
		}

		return {
			agent: "opencode",
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

export async function collectOpenCodeSessions(): Promise<UnifiedSession[]> {
	const baseDir = getOpenCodeBaseDir();
	const sessions: UnifiedSession[] = [];

	const historyDirs = [
		join(baseDir, "sessions"),
		join(baseDir, "history"),
		baseDir,
	];

	for (const historyDir of historyDirs) {
		const jsonlFiles = findJsonlFiles(historyDir);
		for (const filePath of jsonlFiles) {
			const session = parseOpenCodeSession(filePath);
			if (session && session.messages.length > 0) {
				sessions.push(session);
			}
		}

		const jsonFiles = findJsonFiles(historyDir);
		for (const filePath of jsonFiles) {
			if (filePath.includes("config") || filePath.includes("settings")) continue;
			const session = parseOpenCodeSession(filePath);
			if (session && session.messages.length > 0) {
				sessions.push(session);
			}
		}
	}

	return sessions;
}
