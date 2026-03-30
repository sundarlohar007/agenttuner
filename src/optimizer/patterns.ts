export interface VaguePattern {
	pattern: RegExp;
	replacement: string;
}

export const VAGUE_REWRITES: VaguePattern[] = [
	// "write clean code" variations
	{ pattern: /\bwrite\s+clean\s+code\b/gi, replacement: "Prefer `const` over `let`. Use explicit return types." },
	{ pattern: /\bclean\s+(?:and\s+)?maintainable\s+code\b/gi, replacement: "Functions under 30 lines. Files under 200 lines." },
	{ pattern: /\bwrite\s+quality\s+code\b/gi, replacement: "Run `npm lint` before committing." },
	{ pattern: /\bcode\s+quality\b/gi, replacement: "Run `npm lint && npm test` before every commit." },

	// "follow best practices" variations
	{ pattern: /\bfollow\s+best\s+practices\b/gi, replacement: "Run `npm lint` before committing." },
	{ pattern: /\bbest\s+practices\b/gi, replacement: "Run `npm lint` to enforce style." },
	{ pattern: /\bproper\s+practices\b/gi, replacement: "Follow ESLint rules defined in the project." },

	// "ensure proper error handling" variations
	{ pattern: /\bensure\s+proper\s+error\s+handling\b/gi, replacement: "Wrap async calls in try/catch. Log errors with context." },
	{ pattern: /\bproper\s+error\s+handling\b/gi, replacement: "Wrap async calls in try/catch. Log errors with context." },
	{ pattern: /\berror\s+handling\s+is\s+(?:very\s+)?important\b/gi, replacement: "Wrap async calls in try/catch. Log errors with context." },
	{ pattern: /\bhandle\s+errors\s+properly\b/gi, replacement: "Wrap async calls in try/catch." },

	// "be careful with" variations
	{ pattern: /\bbe\s+careful\s+with\s+async\b/gi, replacement: "Use `async/await`. Handle rejections with try/catch." },
	{ pattern: /\bbe\s+careful\s+with\b/gi, replacement: "Run tests after changes to" },

	// "make sure to" variations
	{ pattern: /\bmake\s+sure\s+to\s+handle\s+(?:all\s+)?edge\s+cases\b/gi, replacement: "Add test cases for empty input, null values, and boundary conditions." },
	{ pattern: /\bmake\s+sure\s+to\b/gi, replacement: "Run `npm test` to verify" },
	{ pattern: /\bensure\s+that\b/gi, replacement: "Verify with" },

	// "write tests" variations
	{ pattern: /\balways\s+write\s+tests\b/gi, replacement: "Every PR needs `npm test` passing." },
	{ pattern: /\bwrite\s+(?:comprehensive|thorough)\s+tests\b/gi, replacement: "Add tests for new functions. Run `npm test` before committing." },
	{ pattern: /\bwrite\s+tests\s+for\b/gi, replacement: "Add test coverage for" },

	// "write documentation" variations
	{ pattern: /\bwrite\s+(?:good|proper|clear)\s+documentation\b/gi, replacement: "Add JSDoc comments to exported functions." },
	{ pattern: /\bdocument\s+(?:your\s+)?code\b/gi, replacement: "Add JSDoc comments to exported functions." },

	// "keep code maintainable" variations
	{ pattern: /\bkeep\s+(?:the\s+)?code\s+maintainable\b/gi, replacement: "Functions under 30 lines. Files under 200 lines." },
	{ pattern: /\bmaintainable\s+code\b/gi, replacement: "Functions under 30 lines. Files under 200 lines." },

	// "use meaningful names" variations
	{ pattern: /\buse\s+meaningful\s+(?:variable\s+)?names\b/gi, replacement: "Variables: `userName` not `u`. Functions: `getUserById` not `get`." },
	{ pattern: /\bmeaningful\s+names\b/gi, replacement: "Variables: `userName` not `u`. Functions: `getUserById` not `get`." },
	{ pattern: /\bdescriptive\s+names\b/gi, replacement: "Variables: `userName` not `u`. Functions: `getUserById` not `get`." },

	// "don't repeat yourself" variations
	{ pattern: /\bdon'?t\s+repeat\s+yourself\b/gi, replacement: "Extract shared logic into utility functions. Use `src/utils/` for helpers." },
	{ pattern: /\bDRY\s+principle\b/gi, replacement: "Extract shared logic into utility functions. Use `src/utils/` for helpers." },

	// "keep it simple" variations
	{ pattern: /\bkeep\s+(?:it|things)\s+simple\b/gi, replacement: "Prefer simple functions over complex abstractions." },
	{ pattern: /\bKISS\s+principle\b/gi, replacement: "Prefer simple functions over complex abstractions." },

	// "be consistent" variations
	{ pattern: /\bbe\s+consistent\b/gi, replacement: "Follow existing patterns in the codebase." },
	{ pattern: /\bconsistency\b/gi, replacement: "Match the style of surrounding code." },

	// Generic unhelpful phrases
	{ pattern: /\bthink\s+(?:carefully|hard)\s+(?:about|before)\b/gi, replacement: "Consider edge cases before implementing." },
	{ pattern: /\bpay\s+attention\s+to\b/gi, replacement: "Review" },
	{ pattern: /\bremember\s+to\b/gi, replacement: "Run `npm test` after" },
	{ pattern: /\bdon'?t\s+forget\s+to\b/gi, replacement: "Run `npm test` after" },
	{ pattern: /\bit'?s\s+important\s+to\b/gi, replacement: "Always" },
	{ pattern: /\bplease\s+make\s+sure\b/gi, replacement: "Verify" },
	{ pattern: /\btry\s+to\b/gi, replacement: "" },
	{ pattern: /\bshould\s+(?:always|probably)\b/gi, replacement: "Prefer to" },
];

const ABSOLUTE_PATTERNS = {
	always: {
		pattern: /\bALWAYS\b/g,
		replaceWith: "Prefer to",
	},
	never: {
		pattern: /\bNEVER\b/g,
		replaceWith: "Avoid",
	},
};

export function rewriteVagueInstructions(content: string): string {
	let result = content;
	for (const { pattern, replacement } of VAGUE_REWRITES) {
		result = result.replace(pattern, replacement);
	}
	return result;
}

export function rewriteAbsolutes(content: string): string {
	let result = content;
	result = result.replace(ABSOLUTE_PATTERNS.always.pattern, ABSOLUTE_PATTERNS.always.replaceWith);
	result = result.replace(ABSOLUTE_PATTERNS.never.pattern, ABSOLUTE_PATTERNS.never.replaceWith);
	return result;
}

export function countVaguePatterns(content: string): number {
	let count = 0;
	for (const { pattern } of VAGUE_REWRITES) {
		const matches = content.match(pattern);
		if (matches) count += matches.length;
	}
	return count;
}

export function countAbsolutes(content: string): number {
	const alwaysCount = (content.match(ABSOLUTE_PATTERNS.always.pattern) || []).length;
	const neverCount = (content.match(ABSOLUTE_PATTERNS.never.pattern) || []).length;
	return alwaysCount + neverCount;
}
