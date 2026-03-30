import type { WastePattern } from "../analyzers/types.js";
import type { ConfigIssue } from "../diagnostics/types.js";
import { rewriteVagueInstructions, rewriteAbsolutes, countVaguePatterns, countAbsolutes } from "./patterns.js";

const SECTION_TEMPLATES: Record<string, string[]> = {
	architecture: [
		"## Architecture",
		"{tech} {type}. {structure}.",
	],
	commands: [
		"## Commands",
		"- Install: `{install}`",
		"- Dev: `{dev}`",
		"- Test: `{test}`",
		"- Lint: `{lint}`",
		"- Build: `{build}`",
	],
	conventions: [
		"## Conventions",
		"- Prefer `const` over `let`. Never use `var`.",
		"- Use explicit return types on exported functions.",
		"- Prefer named exports over default exports.",
	],
	constraints: [
		"## Constraints",
		"- Never modify lock files directly.",
		"- Never commit `.env` files.",
		"- Never skip TypeScript errors.",
	],
	verification: [
		"## Verification",
		"- Run `{test}` to verify changes.",
		"- Run `{lint}` to check code style.",
		"- Run `{typecheck}` to verify types.",
	],
	pitfalls: [
		"## Common Pitfalls",
	],
	blocked: [
		"## When Blocked",
		"- Check existing code for similar patterns.",
		"- Read error messages fully before searching.",
		"- Ask the user for clarification, don't guess.",
	],
};

interface SectionInfo {
	name: string;
	startLine: number;
	endLine: number;
	content: string;
}

function parseSections(content: string): SectionInfo[] {
	const lines = content.split("\n");
	const sections: SectionInfo[] = [];
	let current: SectionInfo | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		const headerMatch = line.match(/^#{1,3}\s+(.+)/);

		if (headerMatch) {
			if (current) {
				current.endLine = i - 1;
				sections.push(current);
			}
			current = {
				name: headerMatch[1]!.trim().toLowerCase(),
				startLine: i,
				endLine: lines.length - 1,
				content: "",
			};
		} else if (current) {
			current.content += line + "\n";
		}
	}

	if (current) {
		current.endLine = lines.length - 1;
		sections.push(current);
	}

	return sections;
}

function hasSection(sections: SectionInfo[], name: string): boolean {
	return sections.some((s) => s.name.includes(name));
}

function isProseLine(line: string): boolean {
	const trimmed = line.trim();
	if (trimmed.length === 0) return false;
	if (trimmed.startsWith("#")) return false;
	if (trimmed.startsWith("-") || trimmed.startsWith("*")) return false;
	if (/`[^`]+`/.test(trimmed)) return false;
	if (trimmed.length > 100) return true;
	return false;
}

function convertProseToBullets(content: string): string {
	const lines = content.split("\n");
	const result: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		if (isProseLine(line)) {
			const trimmed = line.trim();
			if (trimmed.endsWith(".")) {
				result.push(`- ${trimmed}`);
			} else {
				result.push(`- ${trimmed}`);
			}
		} else {
			result.push(line);
		}
	}

	return result.join("\n");
}

function removeRedundantInfo(content: string): string {
	const redundantPatterns = [
		/This (?:is a |project uses? )?(?:TypeScript|JavaScript|Python|Go|Rust|Java) (?:project|application)/gi,
		/We use (?:pnpm|npm|yarn|bun) as (?:our )?package manager/gi,
		/(?:TypeScript|JavaScript) (?:strict )?mode/gi,
	];

	let result = content;
	for (const pattern of redundantPatterns) {
		result = result.replace(pattern, "");
	}
	return result;
}

function trimEmptyLines(content: string): string {
	return content
		.split("\n")
		.reduce<string[]>((acc, line) => {
			if (line.trim() === "" && acc.length > 0 && acc[acc.length - 1]?.trim() === "") {
				return acc;
			}
			acc.push(line);
			return acc;
		}, [])
		.join("\n")
		.trim();
}

function buildPitfallsSection(wastePatterns: WastePattern[]): string[] {
	const lines: string[] = ["## Common Pitfalls"];

	const patternTips: Record<string, string> = {
		"repeated-read": "- Don't re-read files — assume content hasn't changed",
		"repeated-command": "- Run commands once. Analyze output before retrying.",
		"exploration-loop": "- Read specific files. Avoid broad directory exploration.",
		"file-churn": "- Write files once. Review content before writing.",
		"idle-turn": "- If nothing to do, say so. Don't give empty responses.",
		"empty-tool-result": "- Check tool parameters before calling. Fix and retry once.",
		"large-output-ignored": "- Read large files in chunks. Summarize what you see.",
	};

	for (const pattern of wastePatterns) {
		const tip = patternTips[pattern.type];
		if (tip && !lines.includes(tip)) {
			lines.push(tip);
		}
	}

	if (lines.length === 1) {
		lines.push("- Don't re-read files — assume content hasn't changed");
		lines.push("- Run commands once. Analyze output before retrying.");
		lines.push("- Read specific files. Avoid broad directory exploration.");
	}

	return lines;
}

function detectPackageManager(content: string): string {
	if (content.includes("pnpm")) return "pnpm";
	if (content.includes("yarn")) return "yarn";
	if (content.includes("bun")) return "bun";
	return "npm";
}

function buildMissingSections(
	sections: SectionInfo[],
	content: string,
	wastePatterns: WastePattern[],
): string[] {
	const missing: string[] = [];
	const pm = detectPackageManager(content);

	if (!hasSection(sections, "command")) {
		missing.push(
			SECTION_TEMPLATES["commands"]!.join("\n")
				.replace("{install}", `${pm} install`)
				.replace("{dev}", `${pm} dev`)
				.replace("{test}", `${pm} test`)
				.replace("{lint}", `${pm} lint`)
				.replace("{build}", `${pm} build`),
		);
	}

	if (!hasSection(sections, "convention")) {
		missing.push(SECTION_TEMPLATES["conventions"]!.join("\n"));
	}

	if (!hasSection(sections, "constraint")) {
		missing.push(SECTION_TEMPLATES["constraints"]!.join("\n"));
	}

	if (!hasSection(sections, "verif")) {
		missing.push(
			SECTION_TEMPLATES["verification"]!.join("\n")
				.replace("{test}", `${pm} test`)
				.replace("{lint}", `${pm} lint`)
				.replace("{typecheck}", `${pm} typecheck`),
		);
	}

	if (!hasSection(sections, "pitfall")) {
		missing.push(buildPitfallsSection(wastePatterns).join("\n"));
	}

	if (!hasSection(sections, "block") && !hasSection(sections, "escalat")) {
		missing.push(SECTION_TEMPLATES["blocked"]!.join("\n"));
	}

	return missing;
}

function enforceLineLimit(content: string, maxLines: number): string {
	const lines = content.split("\n");
	if (lines.length <= maxLines) return content;

	// Keep essential sections, trim the rest
	const essentialHeaders = ["## commands", "## constraints", "## verification", "## common pitfalls", "## conventions"];
	const result: string[] = [];
	let keepMode = true;
	let currentHeader = "";

	for (const line of lines) {
		const lower = line.trim().toLowerCase();
		if (lower.startsWith("##")) {
			currentHeader = lower;
			keepMode = essentialHeaders.some((h) => lower.includes(h.replace("## ", "")));
		}

		if (keepMode || line.trim().startsWith("#")) {
			result.push(line);
		}

		if (result.length >= maxLines) break;
	}

	return result.join("\n");
}

export function advancedRuleBasedOptimization(
	content: string,
	issues: ConfigIssue[],
	wastePatterns: WastePattern[],
): string {
	let result = content;

	// Step 1: Rewrite vague instructions
	result = rewriteVagueInstructions(result);

	// Step 2: Rewrite ALWAYS/NEVER
	result = rewriteAbsolutes(result);

	// Step 3: Remove redundant info
	result = removeRedundantInfo(result);

	// Step 4: Convert long prose to bullet points
	const lines = result.split("\n");
	const proseLineCount = lines.filter(isProseLine).length;
	if (proseLineCount > 2) {
		result = convertProseToBullets(result);
	}

	// Step 5: Trim empty lines
	result = trimEmptyLines(result);

	// Step 6: Add missing sections
	const sections = parseSections(result);
	const missingSections = buildMissingSections(sections, content, wastePatterns);
	if (missingSections.length > 0) {
		result = result + "\n\n" + missingSections.join("\n\n");
	}

	// Step 7: Enforce line limit
	result = enforceLineLimit(result, 100);

	// Step 8: Final cleanup
	result = trimEmptyLines(result);

	return result;
}

export function getOptimizationStats(original: string, optimized: string): {
	vaguePatternsRemoved: number;
	absolutesRewritten: number;
	linesAdded: number;
	linesRemoved: number;
} {
	const originalVague = countVaguePatterns(original);
	const optimizedVague = countVaguePatterns(optimized);
	const originalAbsolutes = countAbsolutes(original);
	const optimizedAbsolutes = countAbsolutes(optimized);

	const originalLines = original.split("\n").length;
	const optimizedLines = optimized.split("\n").length;

	return {
		vaguePatternsRemoved: originalVague - optimizedVague,
		absolutesRewritten: originalAbsolutes - optimizedAbsolutes,
		linesAdded: Math.max(0, optimizedLines - originalLines),
		linesRemoved: Math.max(0, originalLines - optimizedLines),
	};
}
