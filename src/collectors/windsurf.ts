import { readdirSync } from "node:fs";
import { join } from "node:path";
import { getWindsurfBaseDir, findJsonlFiles, readFileContent } from "../utils/fs.js";
import type { UnifiedSession, UnifiedMessage, ToolCall } from "./types.js";

interface WindsurfMessage {
	role?: string;
	content?: string | unknown;
	timestamp?: string;
	tool_calls?: Array<{ name: string; input: Record<string, unknown>; output?: string }>;
	tokenUsage?: { input?: number; output?: number };
	usage?: { inputTokens?: number; outputTokens?: number };
}

function parseWindsurfJsonl(filePath: string): UnifiedSession | null {
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
				const entry: WindsurfMessage = JSON.parse(line);
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

				const toolCalls: ToolCall[] | undefined = entry.tool_calls?.map((tc) => ({
					name: tc.name,
					input: tc.input ?? {},
					output: tc.output,
				}));

				let messageContent: string;
				if (typeof entry.content === "string") {
					messageContent = entry.content;
				} else if (Array.isArray(entry.content)) {
					messageContent = (entry.content as Array<Record<string, unknown>>)
						.filter((c) => c.type === "text")
						.map((c) => (c.text as string) ?? "")
						.join("\n");
				} else {
					messageContent = JSON.stringify(entry.content ?? "");
				}

				messages.push({
					role: role === "user" || role === "assistant" || role === "system" ? role : "assistant",
					content: messageContent,
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
			} catch {
				// Skip malformed lines
			}
		}

		if (!sessionId) {
			sessionId = filePath.split(/[/\\]/).pop()?.replace(/\.jsonl$/, "") ?? "unknown";
		}

		return {
			agent: "windsurf",
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

export async function collectWindsurfSessions(): Promise<UnifiedSession[]> {
	const baseDir = getWindsurfBaseDir();
	const sessions: UnifiedSession[] = [];

	const historyDirs = [
		join(baseDir, "User", "workspaceStorage"),
		join(baseDir, "workspaceStorage"),
		join(baseDir, "history"),
		join(baseDir, "sessions"),
	];

	for (const historyDir of historyDirs) {
		const jsonlFiles = findJsonlFiles(historyDir);
		for (const filePath of jsonlFiles) {
			const session = parseWindsurfJsonl(filePath);
			if (session && session.messages.length > 0) {
				sessions.push(session);
			}
		}
	}

	return sessions;
}
