import { existsSync } from "node:fs";
import { join } from "node:path";
import { findJsonlFiles, getCodexBaseDir } from "../utils/fs.js";
import { readJsonl } from "../utils/jsonl.js";
import type { UnifiedMessage, UnifiedSession } from "./types.js";

function extractCodexToolCalls(content: unknown): {
	toolCalls: NonNullable<UnifiedMessage["toolCalls"]>;
	textContent: string;
} {
	const toolCalls: NonNullable<UnifiedMessage["toolCalls"]> = [];
	const textParts: string[] = [];

	if (!Array.isArray(content)) return { toolCalls, textContent: "" };

	for (const block of content as Array<Record<string, unknown>>) {
		const type = block["type"] as string;
		if (type === "input_text" && block["text"]) {
			textParts.push(block["text"] as string);
		} else if (type === "tool_use" && block["name"]) {
			toolCalls.push({
				name: block["name"] as string,
				input: block as Record<string, unknown>,
			});
		}
	}

	return { toolCalls, textContent: textParts.join("\n") };
}

export async function collectCodexSessions(): Promise<UnifiedSession[]> {
	const baseDir = getCodexBaseDir();
	const sessionsDir = join(baseDir, "sessions");

	if (!existsSync(sessionsDir)) return [];

	const sessions: UnifiedSession[] = [];
	const jsonlFiles = findJsonlFiles(sessionsDir);

	for (const file of jsonlFiles) {
		try {
			const session = await parseCodexSessionFile(file);
			if (session && session.messages.length > 0) {
				sessions.push(session);
			}
		} catch {
			// Skip corrupted files
		}
	}

	return sessions;
}

async function parseCodexSessionFile(filePath: string): Promise<UnifiedSession | null> {
	const messages: UnifiedMessage[] = [];
	let sessionId = "";
	let projectPath = "";
	const totalInputTokens = 0;
	const totalOutputTokens = 0;
	let startTime = "";
	let endTime = "";

	for await (const entry of readJsonl(filePath)) {
		const type = entry["type"] as string;

		if (type === "session_start") {
			const payload = entry["payload"] as Record<string, unknown> | undefined;
			sessionId = (payload?.["session_id"] as string) ?? filePath;
			projectPath = (payload?.["working_directory"] as string) ?? "";
			const ts = entry["timestamp"];
			startTime = new Date(typeof ts === "number" ? ts : Date.now()).toISOString();
			continue;
		}

		const ts = entry["timestamp"];
		const timestamp = new Date(typeof ts === "number" ? ts : Date.now()).toISOString();

		if (type === "event_msg") {
			if (!startTime) startTime = timestamp;
			const payload = entry["payload"] as Record<string, unknown> | undefined;
			messages.push({
				role: "user",
				content: (payload?.["message"] as string) ?? "",
				timestamp,
			});
			endTime = timestamp;
		} else if (type === "response_item") {
			const payload = entry["payload"] as Record<string, unknown> | undefined;
			const { toolCalls, textContent } = extractCodexToolCalls(payload?.["content"]);

			messages.push({
				role: "assistant",
				content: textContent,
				timestamp,
				toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
			});
			endTime = timestamp;
		}
	}

	if (messages.length === 0) return null;

	return {
		agent: "codex",
		sessionId: sessionId || filePath,
		projectPath,
		startTime: startTime || new Date().toISOString(),
		endTime: endTime || new Date().toISOString(),
		messages,
		totalInputTokens,
		totalOutputTokens,
	};
}
