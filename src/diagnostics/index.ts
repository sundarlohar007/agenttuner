import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { parseConfigSections } from "./parser.js";
import { calculateScore, runAllRules } from "./rules.js";
import { getRecommendedSections } from "./scorer.js";
import type { DiagnosticResult } from "./types.js";

export function diagnoseConfig(filePath: string): DiagnosticResult {
	const content = readFileSync(filePath, "utf-8");
	const sections = parseConfigSections(content);
	const lineCount = content.split("\n").length;
	const issues = runAllRules(content, sections, lineCount);
	const score = calculateScore(issues);

	// Find missing recommended sections
	const recommended = getRecommendedSections();
	const existing = sections.map((s) => s.name.toLowerCase());
	const missingSections = recommended.filter(
		(r) => !existing.some((e) => e.includes(r.toLowerCase())),
	);

	return {
		filePath,
		score,
		issues,
		sections,
		missingSections,
		lineCount,
	};
}

export function diagnoseConfigContent(content: string, filePath = "CLAUDE.md"): DiagnosticResult {
	const sections = parseConfigSections(content);
	const lineCount = content.split("\n").length;
	const issues = runAllRules(content, sections, lineCount);
	const score = calculateScore(issues);

	const recommended = getRecommendedSections();
	const existing = sections.map((s) => s.name.toLowerCase());
	const missingSections = recommended.filter(
		(r) => !existing.some((e) => e.includes(r.toLowerCase())),
	);

	return {
		filePath,
		score,
		issues,
		sections,
		missingSections,
		lineCount,
	};
}

export type {
	ConfigIssue,
	DiagnosticResult,
	ParsedSection,
} from "./types.js";
