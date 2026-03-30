import { type Dirent, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { findJsonlFiles, getClaudeBaseDir } from "../utils/fs.js";
import { readJsonl } from "../utils/jsonl.js";
import type { UnifiedMessage, UnifiedSession } from "./types.js";

function extractTextContent(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return (content as Array<Record<string, unknown>>)
		.filter((c) => c["type"] === "text")
		.map((c) => (c["text"] as string) ?? "")
		.join("\n");
}

function extractToolCalls(content: unknown): {
	toolCalls: NonNullable<UnifiedMessage["toolCalls"]>;
	textContent: string;
} {
	const toolCalls: NonNullable<UnifiedMessage["toolCalls"]> = [];
	const textParts: string[] = [];

	if (!Array.isArray(content)) return { toolCalls, textContent: "" };

	for (const block of content as Array<Record<string, unknown>>) {
		const type = block["type"] as string;
		if (type === "text" && block["text"]) {
			textParts.push(block["text"] as string);
		} else if (type === "tool_use" && block["name"]) {
			toolCalls.push({
				name: block["name"] as string,
				input: (block["input"] as Record<string, unknown>) ?? {},
			});
		} else if (type === "tool_result" && typeof block["content"] === "string") {
			if (toolCalls.length > 0) {
				toolCalls[toolCalls.length - 1]!.output = block["content"] as string;
			}
		}
	}

	return { toolCalls, textContent: textParts.join("\n") };
}

export async function collectClaudeSessions(): Promise<UnifiedSession[]> {
	const baseDir = getClaudeBaseDir();
	if (!existsSync(baseDir)) return [];

	const sessions: UnifiedSession[] = [];
	const projectDirs = readdirSync(baseDir, { withFileTypes: true }).filter((d: Dirent) =>
		d.isDirectory(),
	);

	for (const projectDir of projectDirs) {
		const projectPath = join(baseDir, projectDir.name);
		const jsonlFiles = findJsonlFiles(projectPath);

		for (const file of jsonlFiles) {
			if (file.includes("agent-")) continue;

			try {
				const session = await parseClaudeSessionFile(file);
				if (session && session.messages.length > 0) {
					sessions.push(session);
				}
			} catch {
				// Skip corrupted files
			}
		}
	}

	return sessions;
}

async function parseClaudeSessionFile(filePath: string): Promise<UnifiedSession | null> {
	const messages: UnifiedMessage[] = [];
	let sessionId = "";
	let projectPath = "";
	let totalInputTokens = 0;
	let totalOutputTokens = 0;
	let startTime = "";
	let endTime = "";

	for await (const entry of readJsonl(filePath)) {
		const type = entry["type"] as string;

		if (type === "summary") continue;

		if (type === "user") {
			const msg = entry as Record<string, unknown>;
			const msgData = msg["message"] as Record<string, unknown> | undefined;
			if (!sessionId) sessionId = (msg["sessionId"] as string) ?? "";
			if (!projectPath && msg["cwd"]) projectPath = msg["cwd"] as string;
			if (!startTime) startTime = (msg["timestamp"] as string) ?? "";

			const content = extractTextContent(msgData?.["content"]);
			if (!content) continue;

			messages.push({
				role: "user",
				content,
				timestamp: (msg["timestamp"] as string) ?? "",
			});

			endTime = (msg["timestamp"] as string) ?? "";
		} else if (type === "assistant") {
			const msg = entry as Record<string, unknown>;
			const msgData = msg["message"] as Record<string, unknown> | undefined;
			if (!sessionId) sessionId = (msg["sessionId"] as string) ?? "";

			const { toolCalls, textContent } = extractToolCalls(msgData?.["content"]);

			const usage = msgData?.["usage"] as Record<string, number> | undefined;
			const inputTokens = usage?.["input_tokens"] ?? 0;
			const outputTokens = usage?.["output_tokens"] ?? 0;
			totalInputTokens += inputTokens;
			totalOutputTokens += outputTokens;

			messages.push({
				role: "assistant",
				content: textContent,
				timestamp: (msg["timestamp"] as string) ?? "",
				toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
				tokenUsage: { input: inputTokens, output: outputTokens },
			});

			endTime = (msg["timestamp"] as string) ?? "";
		}
	}

	if (!sessionId) return null;

	return {
		agent: "claude-code",
		sessionId,
		projectPath,
		startTime,
		endTime,
		messages,
		totalInputTokens,
		totalOutputTokens,
	};
}
