import type { ConfigIssue, ParsedSection } from "./types.js";

interface DiagnosticRule {
	id: string;
	severity: "error" | "warning" | "info";
	weight: number;
	check: (content: string, sections: ParsedSection[], lineCount: number) => ConfigIssue | null;
}

const RULES: DiagnosticRule[] = [
	{
		id: "too-long",
		severity: "warning",
		weight: -5,
		check: (_content, _sections, lineCount) => {
			if (lineCount > 150) {
				return {
					ruleId: "too-long",
					severity: "warning",
					message: `Config file is ${lineCount} lines. Target is under 100 lines.`,
					suggestion:
						"Remove redundant content. Ask: 'If I remove this, will the agent make a mistake it cannot recover from?'",
				};
			}
			return null;
		},
	},
	{
		id: "no-pitfalls",
		severity: "warning",
		weight: -5,
		check: (_content, sections) => {
			const hasPitfalls = sections.some(
				(s) =>
					s.name.toLowerCase().includes("pitfall") ||
					s.name.toLowerCase().includes("anti-pattern") ||
					s.name.toLowerCase().includes("common mistakes") ||
					s.name.toLowerCase().includes("gotchas"),
			);
			if (!hasPitfalls) {
				return {
					ruleId: "no-pitfalls",
					severity: "warning",
					message: "Missing 'Common Pitfalls' section.",
					suggestion:
						"Add a '## Common Pitfalls' section with specific mistakes you've caught the agent making.",
				};
			}
			return null;
		},
	},
	{
		id: "no-commands",
		severity: "error",
		weight: -15,
		check: (_content, sections) => {
			const hasCommandSection = sections.some(
				(s) =>
					s.name.toLowerCase().includes("command") ||
					s.name.toLowerCase().includes("build") ||
					s.name.toLowerCase().includes("test"),
			);
			if (!hasCommandSection) {
				return {
					ruleId: "no-commands",
					severity: "error",
					message: "Missing build/test commands section.",
					suggestion:
						'Add a "## Commands" section with exact install, dev, test, lint, and build commands.',
				};
			}
			return null;
		},
	},
	{
		id: "no-constraints",
		severity: "warning",
		weight: -5,
		check: (_content, sections) => {
			const hasConstraints = sections.some(
				(s) =>
					s.name.toLowerCase().includes("constraint") ||
					s.name.toLowerCase().includes("boundary") ||
					s.name.toLowerCase().includes("never"),
			);
			if (!hasConstraints) {
				return {
					ruleId: "no-constraints",
					severity: "warning",
					message: "Missing constraints/boundaries section.",
					suggestion:
						'Add a "## Constraints" section listing files/areas the agent should never modify.',
				};
			}
			return null;
		},
	},
	{
		id: "no-verification",
		severity: "warning",
		weight: -5,
		check: (_content, sections) => {
			const hasVerification = sections.some(
				(s) =>
					s.name.toLowerCase().includes("verification") ||
					s.name.toLowerCase().includes("definition of done") ||
					s.name.toLowerCase().includes("done"),
			);
			if (!hasVerification) {
				return {
					ruleId: "no-verification",
					severity: "warning",
					message: "Missing verification/definition-of-done section.",
					suggestion:
						'Add a "## Verification" section listing commands the agent must run before marking complete.',
				};
			}
			return null;
		},
	},
	{
		id: "vague-rules",
		severity: "error",
		weight: -15,
		check: (content) => {
			const vaguePhrases = [
				"write clean code",
				"ensure proper error handling",
				"follow best practices",
				"be careful",
				"make sure to",
				"handle errors gracefully",
				"write good code",
				"maintain code quality",
			];
			const found: string[] = [];
			const contentLower = content.toLowerCase();
			for (const phrase of vaguePhrases) {
				if (contentLower.includes(phrase)) {
					found.push(phrase);
				}
			}
			if (found.length > 0) {
				return {
					ruleId: "vague-rules",
					severity: "error",
					message: `Contains vague instructions: ${found.map((f) => `"${f}"`).join(", ")}`,
					suggestion:
						'Replace vague phrases with specific, verifiable instructions. E.g., "run `ruff check .` before committing" instead of "write clean code".',
				};
			}
			return null;
		},
	},
	{
		id: "always-never",
		severity: "warning",
		weight: -5,
		check: (content) => {
			const alwaysCount = (content.match(/\bALWAYS\b/g) || []).length;
			const neverCount = (content.match(/\bNEVER\b/g) || []).length;
			if (alwaysCount + neverCount > 3) {
				return {
					ruleId: "always-never",
					severity: "warning",
					message: `${alwaysCount + neverCount} uses of ALWAYS/NEVER. These leave no room for exceptions.`,
					suggestion:
						'Use "prefer" and "avoid" with explicit exception clauses instead of ALWAYS/NEVER.',
				};
			}
			return null;
		},
	},
	{
		id: "prose-heavy",
		severity: "warning",
		weight: -5,
		check: (content, _sections, lineCount) => {
			// Check if config is mostly prose (long lines without bullets or commands)
			const lines = content.split("\n");
			const proseLines = lines.filter(
				(l) =>
					l.length > 100 &&
					!l.startsWith("-") &&
					!l.startsWith("*") &&
					!l.startsWith("#") &&
					!/`[^`]+`/.test(l),
			);
			if (proseLines.length > lines.length * 0.4) {
				return {
					ruleId: "prose-heavy",
					severity: "warning",
					message: "Config is mostly prose paragraphs. Agents process bullet points better.",
					suggestion:
						"Convert prose into bullet points. Each instruction should be one actionable item.",
				};
			}
			return null;
		},
	},
	{
		id: "duplicates-linter",
		severity: "warning",
		weight: -5,
		check: (content) => {
			const linterTerms = [
				"indentation",
				"semicolons",
				"single quotes",
				"double quotes",
				"max line length",
				"no unused",
				"trailing comma",
				"format on save",
			];
			const found: string[] = [];
			const contentLower = content.toLowerCase();
			for (const term of linterTerms) {
				if (contentLower.includes(term)) found.push(term);
			}
			if (found.length >= 3) {
				return {
					ruleId: "duplicates-linter",
					severity: "warning",
					message: "Config appears to duplicate linter/formatter rules.",
					suggestion:
						'Replace style rules with: "Run `pnpm lint` and `pnpm format` before committing."',
				};
			}
			return null;
		},
	},
	{
		id: "restates-package-json",
		severity: "warning",
		weight: -5,
		check: (content) => {
			const packageTerms = [
				"typescript",
				"node.js",
				"node ",
				"pnpm",
				"npm",
				"yarn",
				"eslint",
				"prettier",
				"vitest",
				"jest",
			];
			const found: string[] = [];
			const contentLower = content.toLowerCase();
			for (const term of packageTerms) {
				if (contentLower.includes(term)) found.push(term);
			}
			if (found.length >= 4) {
				return {
					ruleId: "restates-package-json",
					severity: "warning",
					message: "Config appears to restate package.json information.",
					suggestion:
						"Remove tool versions and package manager info — the agent can read package.json directly.",
				};
			}
			return null;
		},
	},
	{
		id: "no-escalation",
		severity: "info",
		weight: -2,
		check: (content) => {
			const contentLower = content.toLowerCase();
			const hasEscalation =
				contentLower.includes("when blocked") ||
				contentLower.includes("when stuck") ||
				contentLower.includes("if stuck") ||
				contentLower.includes("escalat") ||
				contentLower.includes("ask for help");
			if (!hasEscalation) {
				return {
					ruleId: "no-escalation",
					severity: "info",
					message: "No escalation/when-blocked rules defined.",
					suggestion:
						'Add a section like "## When Blocked" with rules: "If tests fail after 3 attempts, stop and report."',
				};
			}
			return null;
		},
	},
	{
		id: "no-conventions",
		severity: "info",
		weight: -2,
		check: (_content, sections) => {
			const hasConventions = sections.some(
				(s) =>
					s.name.toLowerCase().includes("convention") ||
					s.name.toLowerCase().includes("style") ||
					s.name.toLowerCase().includes("pattern"),
			);
			if (!hasConventions) {
				return {
					ruleId: "no-conventions",
					severity: "info",
					message: "No coding conventions section found.",
					suggestion:
						'Add a "## Conventions" section with naming patterns, import styles, and preferred patterns.',
				};
			}
			return null;
		},
	},
	{
		id: "no-stack",
		severity: "warning",
		weight: -5,
		check: (_content, sections) => {
			const hasStack = sections.some(
				(s) =>
					s.name.toLowerCase().includes("stack") ||
					s.name.toLowerCase().includes("tech") ||
					s.name.toLowerCase().includes("architecture"),
			);
			if (!hasStack) {
				return {
					ruleId: "no-stack",
					severity: "warning",
					message: "No tech stack or architecture section found.",
					suggestion:
						'Add a brief "## Architecture" section — the agent cannot quickly infer this from code.',
				};
			}
			return null;
		},
	},
];

export function runAllRules(
	content: string,
	sections: ParsedSection[],
	lineCount: number,
): ConfigIssue[] {
	const issues: ConfigIssue[] = [];

	for (const rule of RULES) {
		const issue = rule.check(content, sections, lineCount);
		if (issue) {
			issues.push(issue);
		}
	}

	return issues;
}

export function calculateScore(issues: ConfigIssue[]): number {
	let score = 100;

	for (const issue of issues) {
		const rule = RULES.find((r) => r.id === issue.ruleId);
		if (rule) {
			score += rule.weight;
		}
	}

	// Bonus for having key sections (offsets some penalties)
	return Math.max(0, Math.min(100, score));
}
