import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join, resolve } from "node:path";

export function getHomeDir(): string {
	return homedir();
}

export function getClaudeBaseDir(): string {
	return join(getHomeDir(), ".claude");
}

export function getCodexBaseDir(): string {
	return join(getHomeDir(), ".codex");
}

export function getCursorBaseDir(): string {
	const p = platform();
	if (p === "darwin") {
		return join(getHomeDir(), "Library", "Application Support", "Cursor");
	}
	if (p === "win32") {
		return join(getHomeDir(), "AppData", "Roaming", "Cursor");
	}
	return join(getHomeDir(), ".config", "Cursor");
}

export function getAgentTunerDir(): string {
	return join(getHomeDir(), ".agenttuner");
}

export function findConfigFiles(projectPath: string): string[] {
	const candidates = [
		"CLAUDE.md",
		"AGENTS.md",
		".claude/CLAUDE.md",
		".cursorrules",
		".windsurfrules",
		"copilot-instructions.md",
		".github/copilot-instructions.md",
		"GEMINI.md",
		".gemini/GEMINI.md",
	];
	const found: string[] = [];
	for (const candidate of candidates) {
		const fullPath = resolve(projectPath, candidate);
		if (existsSync(fullPath)) {
			found.push(fullPath);
		}
	}
	return found;
}

export function findJsonlFiles(dir: string): string[] {
	if (!existsSync(dir)) return [];
	const results: string[] = [];
	try {
		const entries = readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				results.push(...findJsonlFiles(fullPath));
			} else if (entry.name.endsWith(".jsonl")) {
				results.push(fullPath);
			}
		}
	} catch {
		// Permission denied or other error
	}
	return results;
}

export function readFileContent(filePath: string): string {
	return readFileSync(filePath, "utf-8");
}

export function fileExists(filePath: string): boolean {
	return existsSync(filePath);
}

export function isDirectory(filePath: string): boolean {
	try {
		return statSync(filePath).isDirectory();
	} catch {
		return false;
	}
}
