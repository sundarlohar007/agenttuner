import { type Dirent, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { findJsonlFiles, getCursorBaseDir } from "../utils/fs.js";
import { readJsonl } from "../utils/jsonl.js";
import type { UnifiedMessage, UnifiedSession } from "./types.js";

export async function collectCursorSessions(): Promise<UnifiedSession[]> {
	const baseDir = getCursorBaseDir();
	if (!existsSync(baseDir)) return [];

	const sessions: UnifiedSession[] = [];

	// Try workspaceStorage path
	const projectsDir = join(baseDir, "User", "workspaceStorage");
	if (existsSync(projectsDir)) {
		await scanForTranscripts(projectsDir, sessions);
	}

	// Try ~/.cursor/projects/ path
	const cursorProjectsDir = join(baseDir, "projects");
	if (existsSync(cursorProjectsDir)) {
		await scanForTranscripts(cursorProjectsDir, sessions);
	}

	return sessions;
}

async function scanForTranscripts(baseDir: string, sessions: UnifiedSession[]): Promise<void> {
	try {
		const dirs = readdirSync(baseDir, { withFileTypes: true });
		for (const dir of dirs as Dirent[]) {
			if (!dir.isDirectory()) continue;
			const transcriptDir = join(baseDir, dir.name, "agent-transcripts");
			if (existsSync(transcriptDir)) {
				const files = findJsonlFiles(transcriptDir);
				for (const file of files) {
					try {
						const session = await parseCursorTranscript(file);
						if (session && session.messages.length > 0) {
							sessions.push(session);
						}
					} catch {
						// Skip
					}
				}
			}
		}
	} catch {
		// Permission denied
	}
}

async function parseCursorTranscript(filePath: string): Promise<UnifiedSession | null> {
	const messages: UnifiedMessage[] = [];
	let startTime = "";
	let endTime = "";

	for await (const entry of readJsonl(filePath)) {
		const role = entry["role"] as string | undefined;
		const content = entry["content"];

		if (!role || (role !== "user" && role !== "assistant")) continue;
		if (content === undefined || content === null) continue;

		const timestamp = (entry["timestamp"] as string) ?? new Date().toISOString();
		if (!startTime) startTime = timestamp;
		endTime = timestamp;

		messages.push({
			role: role as "user" | "assistant",
			content: typeof content === "string" ? content : JSON.stringify(content),
			timestamp,
		});
	}

	if (messages.length === 0) return null;

	return {
		agent: "cursor",
		sessionId: filePath,
		projectPath: "",
		startTime: startTime || new Date().toISOString(),
		endTime: endTime || new Date().toISOString(),
		messages,
		totalInputTokens: 0,
		totalOutputTokens: 0,
	};
}
