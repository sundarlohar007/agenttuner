import type { ConfigIssue, DiagnosticResult, ParsedSection } from "./types.js";

export { calculateScore } from "./rules.js";

/**
 * Score interpretation.
 */
export function getScoreLabel(score: number): string {
	if (score >= 90) return "Excellent";
	if (score >= 75) return "Good";
	if (score >= 60) return "Needs Work";
	if (score >= 40) return "Poor";
	return "Critical";
}

export function getScoreColor(score: number): string {
	if (score >= 90) return "green";
	if (score >= 75) return "yellow";
	if (score >= 60) return "yellow";
	if (score >= 40) return "red";
	return "red";
}

/**
 * Generate missing sections recommendation.
 */
export function getRecommendedSections(): string[] {
	return [
		"Architecture",
		"Common Pitfalls",
		"Commands",
		"Constraints",
		"Conventions",
		"Verification",
	];
}
