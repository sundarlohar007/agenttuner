import { join } from "node:path";
import { getAntigravityBaseDir, findJsonFiles, readFileContent } from "../utils/fs.js";
import type { UnifiedSession, UnifiedMessage, ToolCall } from "./types.js";

interface AntigravityMessage {
	role?: string;
	content?: string;
	timestamp?: string;
	toolCalls?: Array<{ name: string; input: Record<string, unknown>; output?: string }>;
	tokenUsage?: { input?: number; output?: number };
	usage?: { inputTokens?: number; outputTokens?: number };
}

function parseAntigravitySession(filePath: string): UnifiedSession | null {
	try {
		const content = readFileContent(filePath);
		const parsed = JSON.parse(content);

		let entries: AntigravityMessage[];
		if (Array.isArray(parsed)) {
			entries = parsed;
		} else if (parsed.messages) {
			entries = parsed.messages;
		} else if (parsed.history) {
			entries = parsed.history;
		} else {
			entries = [parsed];
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
				totalInputTokens += entry.usage.inputTokens ?? 0;
				totalOutputTokens += entry.usage.outputTokens ?? 0;
			}
			if (entry.tokenUsage) {
				totalInputTokens += entry.tokenUsage.input ?? 0;
				totalOutputTokens += entry.tokenUsage.output ?? 0;
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
				tokenUsage:
					entry.usage || entry.tokenUsage
						? {
								input: entry.usage?.inputTokens ?? entry.tokenUsage?.input ?? 0,
								output: entry.usage?.outputTokens ?? entry.tokenUsage?.output ?? 0,
							}
						: undefined,
			});
		}

		if (!sessionId) {
			sessionId =
				parsed.id ?? parsed.sessionId ?? filePath.split(/[/\\]/).pop()?.replace(/\.json$/, "") ?? "unknown";
		}

		return {
			agent: "antigravity",
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

export async function collectAntigravitySessions(): Promise<UnifiedSession[]> {
	const baseDir = getAntigravityBaseDir();
	const sessions: UnifiedSession[] = [];

	const historyDirs = [
		join(baseDir, "sessions"),
		join(baseDir, "history"),
		join(baseDir, "chats"),
		baseDir,
	];

	for (const historyDir of historyDirs) {
		const jsonFiles = findJsonFiles(historyDir);
		for (const filePath of jsonFiles) {
			if (filePath.includes("settings") || filePath.includes("config")) continue;
			const session = parseAntigravitySession(filePath);
			if (session && session.messages.length > 0) {
				sessions.push(session);
			}
		}
	}

	return sessions;
}
