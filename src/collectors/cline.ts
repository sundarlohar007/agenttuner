import { join } from "node:path";
import { getClineBaseDir, findJsonFiles, readFileContent } from "../utils/fs.js";
import type { UnifiedSession, UnifiedMessage, ToolCall } from "./types.js";

interface ClineTask {
	id?: string;
	name?: string;
	createdAt?: string;
	updatedAt?: string;
	messages?: ClineMessage[];
}

interface ClineMessage {
	role?: string;
	content?: string | unknown;
	timestamp?: string;
	toolCall?: { name: string; input: Record<string, unknown>; output?: string };
	tokenUsage?: { input?: number; output?: number };
	apiCost?: number;
}

function parseClineTaskHistory(filePath: string): UnifiedSession | null {
	try {
		const content = readFileContent(filePath);
		const parsed: ClineTask | ClineMessage[] = JSON.parse(content);

		let task: ClineTask;
		if (Array.isArray(parsed)) {
			task = { messages: parsed };
		} else {
			task = parsed;
		}

		if (!task.messages || task.messages.length === 0) return null;

		const messages: UnifiedMessage[] = [];
		let totalInputTokens = 0;
		let totalOutputTokens = 0;
		let startTime = "";
		let endTime = "";

		for (const msg of task.messages) {
			const role = msg.role ?? "assistant";
			const timestamp = msg.timestamp ?? new Date().toISOString();

			if (!startTime) startTime = timestamp;
			endTime = timestamp;

			if (msg.tokenUsage) {
				totalInputTokens += msg.tokenUsage.input ?? 0;
				totalOutputTokens += msg.tokenUsage.output ?? 0;
			}

			const toolCalls: ToolCall[] = [];
			if (msg.toolCall) {
				toolCalls.push({
					name: msg.toolCall.name,
					input: msg.toolCall.input ?? {},
					output: msg.toolCall.output,
				});
			}

			let messageContent: string;
			if (typeof msg.content === "string") {
				messageContent = msg.content;
			} else {
				messageContent = JSON.stringify(msg.content ?? "");
			}

			messages.push({
				role: role === "user" || role === "assistant" || role === "system" ? role : "assistant",
				content: messageContent,
				timestamp,
				toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
				tokenUsage: msg.tokenUsage
					? {
							input: msg.tokenUsage.input ?? 0,
							output: msg.tokenUsage.output ?? 0,
						}
					: undefined,
			});
		}

		const sessionId =
			task.id ?? task.name ?? filePath.split(/[/\\]/).pop()?.replace(/\.json$/, "") ?? "unknown";

		return {
			agent: "cline",
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

export async function collectClineSessions(): Promise<UnifiedSession[]> {
	const baseDir = getClineBaseDir();
	const sessions: UnifiedSession[] = [];

	const historyDirs = [
		join(baseDir, "tasks"),
		join(baseDir, "history"),
		baseDir,
	];

	for (const historyDir of historyDirs) {
		const jsonFiles = findJsonFiles(historyDir);
		for (const filePath of jsonFiles) {
			if (filePath.includes("settings") || filePath.includes("config")) continue;
			const session = parseClineTaskHistory(filePath);
			if (session && session.messages.length > 0) {
				sessions.push(session);
			}
		}
	}

	return sessions;
}
