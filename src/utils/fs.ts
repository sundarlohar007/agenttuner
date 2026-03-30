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

export function getWindsurfBaseDir(): string {
	const p = platform();
	if (p === "darwin") {
		return join(getHomeDir(), "Library", "Application Support", "Windsurf");
	}
	if (p === "win32") {
		return join(getHomeDir(), "AppData", "Roaming", "Windsurf");
	}
	return join(getHomeDir(), ".config", "Windsurf");
}

export function getGeminiBaseDir(): string {
	return join(getHomeDir(), ".gemini");
}

export function getAiderBaseDir(): string {
	return join(getHomeDir(), ".aider");
}

export function getClineBaseDir(): string {
	const p = platform();
	if (p === "darwin") {
		return join(
			getHomeDir(),
			"Library",
			"Application Support",
			"Code",
			"User",
			"globalStorage",
			"saoudrizwan.claude-dev",
		);
	}
	if (p === "win32") {
		return join(
			getHomeDir(),
			"AppData",
			"Roaming",
			"Code",
			"User",
			"globalStorage",
			"saoudrizwan.claude-dev",
		);
	}
	return join(
		getHomeDir(),
		".config",
		"Code",
		"User",
		"globalStorage",
		"saoudrizwan.claude-dev",
	);
}

export function getOpenCodeBaseDir(): string {
	return join(getHomeDir(), ".opencode");
}

export function getCopilotBaseDir(): string {
	const p = platform();
	if (p === "darwin") {
		return join(getHomeDir(), "Library", "Application Support", "Code", "User");
	}
	if (p === "win32") {
		return join(getHomeDir(), "AppData", "Roaming", "Code", "User");
	}
	return join(getHomeDir(), ".config", "Code", "User");
}

export function getAntigravityBaseDir(): string {
	const p = platform();
	if (p === "darwin") {
		return join(
			getHomeDir(),
			"Library",
			"Application Support",
			"Code",
			"User",
			"globalStorage",
			"google.antigravity",
		);
	}
	if (p === "win32") {
		return join(
			getHomeDir(),
			"AppData",
			"Roaming",
			"Code",
			"User",
			"globalStorage",
			"google.antigravity",
		);
	}
	return join(
		getHomeDir(),
		".config",
		"Code",
		"User",
		"globalStorage",
		"google.antigravity",
	);
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
		".windsurf/",
		"copilot-instructions.md",
		".github/copilot-instructions.md",
		".github/instructions/",
		"GEMINI.md",
		".gemini/GEMINI.md",
		".aider.conf.yml",
		".aider.conf.yaml",
		".aider.conventions.md",
		".clinerules",
		".cline/",
		"opencode.json",
		"opencode.jsonc",
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

export function findJsonFiles(dir: string): string[] {
	if (!existsSync(dir)) return [];
	const results: string[] = [];
	try {
		const entries = readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				results.push(...findJsonFiles(fullPath));
			} else if (entry.name.endsWith(".json")) {
				results.push(fullPath);
			}
		}
	} catch {
		// Permission denied or other error
	}
	return results;
}

export function findYamlFiles(dir: string): string[] {
	if (!existsSync(dir)) return [];
	const results: string[] = [];
	try {
		const entries = readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				results.push(...findYamlFiles(fullPath));
			} else if (entry.name.endsWith(".yml") || entry.name.endsWith(".yaml")) {
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
