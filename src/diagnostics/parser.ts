import type { ParsedSection } from "./types.js";

/**
 * Parse a config file (CLAUDE.md, AGENTS.md) into sections.
 */
export function parseConfigSections(content: string): ParsedSection[] {
	const lines = content.split("\n");
	const sections: ParsedSection[] = [];
	let currentSection: ParsedSection | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		const headerMatch = line.match(/^(#{1,3})\s+(.+)/);

		if (headerMatch) {
			// Save previous section
			if (currentSection) {
				currentSection.endLine = i - 1;
				currentSection.lineCount = currentSection.endLine - currentSection.startLine + 1;
				currentSection.hasCommands = detectCommands(currentSection.content);
				sections.push(currentSection);
			}

			currentSection = {
				name: headerMatch[2]!.trim(),
				startLine: i,
				endLine: lines.length - 1,
				content: "",
				lineCount: 0,
				hasCommands: false,
			};
		} else if (currentSection) {
			currentSection.content += line + "\n";
		}
	}

	// Save last section
	if (currentSection) {
		currentSection.endLine = lines.length - 1;
		currentSection.lineCount = currentSection.endLine - currentSection.startLine + 1;
		currentSection.hasCommands = detectCommands(currentSection.content);
		sections.push(currentSection);
	}

	return sections;
}

function detectCommands(content: string): boolean {
	// Detect backtick-wrapped commands like `npm test`, `pnpm build`
	return /`[^`]+`/.test(content);
}

/**
 * Extract commands from config content.
 */
export function extractCommands(content: string): string[] {
	const commandRegex = /`([^`]+)`/g;
	const commands: string[] = [];
	let match: RegExpExecArray | null;

	while ((match = commandRegex.exec(content)) !== null) {
		const cmd = match[1]!;
		// Filter to likely commands (contain spaces or common CLI words)
		if (
			cmd.includes(" ") ||
			/^(npm|pnpm|yarn|bun|make|cargo|pip|go|dotnet|mvn|gradle)\b/.test(cmd)
		) {
			commands.push(cmd);
		}
	}

	return commands;
}
