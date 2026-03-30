import { join } from "node:path";
import { getGeminiBaseDir, findJsonlFiles, readFileContent } from "../utils/fs.js";
import type { UnifiedSession, UnifiedMessage, ToolCall } from "./types.js";

interface GeminiMessage {
	role?: string;
	content?: string;
	parts?: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> }; functionResponse?: { name: string; response: unknown } }>;
	timestamp?: string;
	usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
}

function parseGeminiSession(filePath: string): UnifiedSession | null {
	try {
		const content = readFileContent(filePath);
		const lines = content.split("\n").filter((l) => l.trim());
		if (lines.length === 0) return null;

		const messages: UnifiedMessage[] = [];
		let sessionId = "";
		let projectPath = "";
		let startTime = "";
		let endTime = "";
		let totalInputTokens = 0;
		let totalOutputTokens = 0;

		for (const line of lines) {
			try {
				const entry: GeminiMessage = JSON.parse(line);
				const timestamp = entry.timestamp ?? new Date().toISOString();

				if (!startTime) startTime = timestamp;
				endTime = timestamp;

				if (entry.usageMetadata) {
					totalInputTokens += entry.usageMetadata.promptTokenCount ?? 0;
					totalOutputTokens += entry.usageMetadata.candidatesTokenCount ?? 0;
				}

				const role = entry.role ?? "assistant";

				let messageContent = entry.content ?? "";
				const toolCalls: ToolCall[] = [];

				if (entry.parts) {
					const textParts: string[] = [];
					for (const part of entry.parts) {
						if (part.text) {
							textParts.push(part.text);
						}
						if (part.functionCall) {
							toolCalls.push({
								name: part.functionCall.name,
								input: part.functionCall.args ?? {},
							});
						}
						if (part.functionResponse) {
							toolCalls.push({
								name: part.functionResponse.name,
								input: {},
								output: JSON.stringify(part.functionResponse.response ?? ""),
							});
						}
					}
					if (textParts.length > 0) {
						messageContent = textParts.join("\n");
					}
				}

				messages.push({
					role: role === "user" || role === "assistant" || role === "system" ? role : "assistant",
					content: messageContent,
					timestamp,
					toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
					tokenUsage: entry.usageMetadata
						? {
								input: entry.usageMetadata.promptTokenCount ?? 0,
								output: entry.usageMetadata.candidatesTokenCount ?? 0,
							}
						: undefined,
				});
			} catch {
				// Skip malformed lines
			}
		}

		if (!sessionId) {
			sessionId = filePath.split(/[/\\]/).pop()?.replace(/\.jsonl$/, "") ?? "unknown";
		}

		return {
			agent: "gemini",
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

export async function collectGeminiSessions(): Promise<UnifiedSession[]> {
	const baseDir = getGeminiBaseDir();
	const sessions: UnifiedSession[] = [];

	const historyDirs = [
		join(baseDir, "sessions"),
		join(baseDir, "history"),
		join(baseDir, "logs"),
	];

	for (const historyDir of historyDirs) {
		const jsonlFiles = findJsonlFiles(historyDir);
		for (const filePath of jsonlFiles) {
			const session = parseGeminiSession(filePath);
			if (session && session.messages.length > 0) {
				sessions.push(session);
			}
		}
	}

	return sessions;
}
