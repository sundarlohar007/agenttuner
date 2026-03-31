import type { Pattern } from "../core/types.js";
import { rewriteVagueInstructions } from "./patterns.js";

export interface Mutation {
	config: string;
	mutations: string[];
}

/**
 * Generate config mutations that target scoring features progressively.
 *
 * Strategy: Apply ONE improvement per iteration.
 * This creates a visible improvement curve across iterations.
 *
 * Max 5 mutations.
 */
export function generateMutations(
	currentConfig: string,
	patterns: Pattern[],
): Mutation[] {
	const mutations: Mutation[] = [];
	const lower = currentConfig.toLowerCase();

	// Determine what's missing (in priority order)
	const hasVague = ["write clean code", "follow best practices", "ensure proper", "be careful"]
		.some(p => lower.includes(p));
	const hasCommands = currentConfig.includes("`") && (lower.includes("command") || lower.includes("install"));
	const hasConstraints = lower.includes("constraint") || lower.includes("never");
	const hasPitfalls = lower.includes("pitfall") || lower.includes("common mistake");

	// Generate exactly ONE mutation per missing feature (progressive)

	// Priority 1: Remove vague phrases
	if (hasVague) {
		const cleaned = rewriteVagueInstructions(currentConfig);
		if (cleaned !== currentConfig) {
			mutations.push({
				config: cleaned,
				mutations: ["Removed vague phrases"],
			});
		}
	}

	// Priority 2: Add commands with backticks
	if (!hasCommands) {
		const added = addSection(currentConfig, "Commands", [
			"- Install: `npm install`",
			"- Test: `npm test`",
			"- Lint: `npm run lint`",
			"- Build: `npm run build`",
		]);
		if (!mutations.some(m => m.config === added)) {
			mutations.push({
				config: added,
				mutations: ["Added commands with backticks"],
			});
		}
	}

	// Priority 3: Add constraints section
	if (!hasConstraints) {
		const added = addSection(currentConfig, "Constraints", [
			"- Never modify lock files directly",
			"- Never commit .env files",
			"- Never skip TypeScript errors",
			"- Always run tests before committing",
		]);
		if (!mutations.some(m => m.config === added)) {
			mutations.push({
				config: added,
				mutations: ["Added constraints section"],
			});
		}
	}

	// Priority 4: Add pitfalls section
	if (!hasPitfalls) {
		const added = addSection(currentConfig, "Common Pitfalls", [
			"- Don't re-read files — assume content hasn't changed",
			"- Run commands once. Analyze output before retrying.",
			"- Read specific files. Avoid broad directory exploration.",
		]);
		if (!mutations.some(m => m.config === added)) {
			mutations.push({
				config: added,
				mutations: ["Added common pitfalls"],
			});
		}
	}

	// Priority 5: Inject learned patterns
	if (patterns.length > 0) {
		const topPattern = patterns[0]!;
		if (!currentConfig.includes(topPattern.pattern)) {
			const added = addSection(currentConfig, "Learned Patterns", [
				`- Effective sequence: ${topPattern.pattern} (${(topPattern.successRate * 100).toFixed(0)}% success)`,
			]);
			if (!mutations.some(m => m.config === added)) {
				mutations.push({
					config: added,
					mutations: [`Added pattern: ${topPattern.pattern}`],
				});
			}
		}
	}

	// Fallback: If nothing to improve, add progressive content
	if (mutations.length === 0) {
		const enhanced = addProgressiveContent(currentConfig);
		if (enhanced !== currentConfig) {
			mutations.push({
				config: enhanced,
				mutations: ["Added progressive content"],
			});
		}
	}

	return mutations.slice(0, 5);
}

/**
 * Add a new section to config if it doesn't exist.
 */
function addSection(config: string, sectionName: string, bullets: string[]): string {
	const lower = config.toLowerCase();
	if (lower.includes(sectionName.toLowerCase())) {
		return config;
	}
	return config + `\n\n## ${sectionName}\n${bullets.join("\n")}`;
}

/**
 * Add progressive content when all base features are present.
 */
function addProgressiveContent(config: string): string {
	const lower = config.toLowerCase();

	if (lower.includes("constraint")) {
		return config + "\n- Never modify generated files\n- Never remove existing tests";
	}

	return addSection(config, "Best Practices", [
		"- Write small, focused functions",
		"- Use TypeScript strict mode",
		"- Prefer immutable data patterns",
		"- Test edge cases explicitly",
	]);
}

/**
 * Reorder sections to prioritize Commands and Conventions.
 */
function reorderSections(content: string): string {
	const lines = content.split("\n");
	const sections: Array<{ header: string; lines: string[] }> = [];
	let currentSection: { header: string; lines: string[] } | null = null;

	for (const line of lines) {
		if (line.match(/^#{1,3}\s+/)) {
			if (currentSection) {
				sections.push(currentSection);
			}
			currentSection = { header: line, lines: [] };
		} else if (currentSection) {
			currentSection.lines.push(line);
		}
	}

	if (currentSection) {
		sections.push(currentSection);
	}

	const priority = ["command", "convention", "constraint", "verification", "pitfall", "architecture"];
	const sorted = [...sections].sort((a, b) => {
		const aName = a.header.toLowerCase();
		const bName = b.header.toLowerCase();
		const aIdx = priority.findIndex((p) => aName.includes(p));
		const bIdx = priority.findIndex((p) => bName.includes(p));

		if (aIdx === -1 && bIdx === -1) return 0;
		if (aIdx === -1) return 1;
		if (bIdx === -1) return -1;
		return aIdx - bIdx;
	});

	const originalOrder = sections.map((s) => s.header).join("\n");
	const newOrder = sorted.map((s) => s.header).join("\n");

	if (originalOrder === newOrder) return content;

	return sorted.map((s) => [s.header, ...s.lines].join("\n")).join("\n");
}
