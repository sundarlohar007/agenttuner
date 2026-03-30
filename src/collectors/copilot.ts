import { readdirSync } from "node:fs";
import { join } from "node:path";
import { getCopilotBaseDir, findJsonFiles, readFileContent } from "../utils/fs.js";
import type { UnifiedSession, UnifiedMessage, ToolCall } from "./types.js";

interface CopilotChatEntry {
	role?: string;
	content?: string;
	timestamp?: string;
	id?: string;
	tokenCount?: number;
}

function parseCopilotChatSession(filePath: string): UnifiedSession | null {
	try {
		const content = readFileContent(filePath);
		const parsed = JSON.parse(content);

		let entries: CopilotChatEntry[];
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
		let startTime = "";
		let endTime = "";
		let totalInputTokens = 0;
		let totalOutputTokens = 0;

		for (const entry of entries) {
			const role = entry.role ?? "assistant";
			const timestamp = entry.timestamp ?? new Date().toISOString();

			if (!startTime) startTime = timestamp;
			endTime = timestamp;

			if (role === "user" && entry.tokenCount) {
				totalInputTokens += entry.tokenCount;
			} else if (role === "assistant" && entry.tokenCount) {
				totalOutputTokens += entry.tokenCount;
			}

			messages.push({
				role: role === "user" || role === "assistant" || role === "system" ? role : "assistant",
				content: entry.content ?? "",
				timestamp,
			});
		}

		const sessionId =
			parsed.id ?? filePath.split(/[/\\]/).pop()?.replace(/\.json$/, "") ?? "unknown";

		return {
			agent: "copilot",
			sessionId,
			projectPath: "",
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

export async function collectCopilotSessions(): Promise<UnifiedSession[]> {
	const baseDir = getCopilotBaseDir();
	const sessions: UnifiedSession[] = [];

	const historyDirs = [
		join(baseDir, "globalStorage", "github.copilot", "chat"),
		join(baseDir, "globalStorage", "github.copilot-chat"),
		join(baseDir, "workspaceStorage"),
	];

	for (const historyDir of historyDirs) {
		const jsonFiles = findJsonFiles(historyDir);
		for (const filePath of jsonFiles) {
			if (
				filePath.includes("settings") ||
				filePath.includes("config") ||
				filePath.includes("state")
			)
				continue;
			const session = parseCopilotChatSession(filePath);
			if (session && session.messages.length > 0) {
				sessions.push(session);
			}
		}
	}

	return sessions;
}
