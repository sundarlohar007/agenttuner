import { describe, it, expect } from "vitest";
import { advancedRuleBasedOptimization, getOptimizationStats } from "../../src/optimizer/rules-engine";

describe("advancedRuleBasedOptimization", () => {
	it("should rewrite vague instructions", () => {
		const input = `# Project

Write clean code. Follow best practices.

## Commands
Run \`npm test\` to verify.
`;
		const result = advancedRuleBasedOptimization(input, [], []);
		expect(result).not.toContain("Write clean code");
		expect(result).not.toContain("Follow best practices");
		expect(result).toContain("npm test");
	});

	it("should rewrite ALWAYS and NEVER", () => {
		const input = `# Project

ALWAYS use TypeScript. NEVER use var.
`;
		const result = advancedRuleBasedOptimization(input, [], []);
		expect(result).not.toContain("ALWAYS");
		expect(result).not.toContain("NEVER");
		expect(result).toContain("Prefer to");
		expect(result).toContain("Avoid");
	});

	it("should add missing Commands section", () => {
		const input = `# Project

Some content without commands.
`;
		const result = advancedRuleBasedOptimization(input, [], []);
		expect(result).toContain("## Commands");
		expect(result).toContain("npm");
	});

	it("should add missing Conventions section", () => {
		const input = `# Project

Some content.
`;
		const result = advancedRuleBasedOptimization(input, [], []);
		expect(result).toContain("## Conventions");
	});

	it("should add missing Constraints section", () => {
		const input = `# Project

Some content.
`;
		const result = advancedRuleBasedOptimization(input, [], []);
		expect(result).toContain("## Constraints");
	});

	it("should add missing Verification section", () => {
		const input = `# Project

Some content.
`;
		const result = advancedRuleBasedOptimization(input, [], []);
		expect(result).toContain("## Verification");
	});

	it("should add Common Pitfalls section when waste patterns present", () => {
		const input = `# Project

Some content.
`;
		const wastePatterns = [
			{
				type: "repeated-read" as const,
				severity: "medium" as const,
				description: "Repeated file reads",
				occurrences: 5,
				estimatedWastedTokens: 1000,
				locations: [],
				fixSuggestion: "Read files once",
			},
		];
		const result = advancedRuleBasedOptimization(input, [], wastePatterns);
		expect(result).toContain("## Common Pitfalls");
	});

	it("should preserve existing well-structured sections", () => {
		const input = `# Project

## Commands
- Test: \`npm test\`
- Build: \`npm build\`

## Conventions
- Prefer const over let
`;
		const result = advancedRuleBasedOptimization(input, [], []);
		expect(result).toContain("## Commands");
		expect(result).toContain("npm test");
		expect(result).toContain("## Conventions");
		expect(result).toContain("const");
	});

	it("should detect pnpm package manager", () => {
		const input = `# Project

Uses pnpm for package management.
`;
		const result = advancedRuleBasedOptimization(input, [], []);
		expect(result).toContain("pnpm install");
	});

	it("should detect yarn package manager", () => {
		const input = `# Project

Uses yarn for package management.
`;
		const result = advancedRuleBasedOptimization(input, [], []);
		expect(result).toContain("yarn install");
	});

	it("should convert long prose to bullets", () => {
		const longProse = "This is a very long line that describes in great detail how the code should be written and what practices should be followed throughout the entire development process for this particular project.";
		const input = `# Project

${longProse}
${longProse}
${longProse}
${longProse}
`;
		const result = advancedRuleBasedOptimization(input, [], []);
		expect(result).toContain("- ");
	});

	it("should trim empty lines", () => {
		const input = `# Project


Some content.


More content.
`;
		const result = advancedRuleBasedOptimization(input, [], []);
		expect(result).not.toMatch(/\n\n\n/);
	});

	it("should not duplicate existing sections", () => {
		const input = `# Project

## Commands
- Test: \`npm test\`
`;
		const result = advancedRuleBasedOptimization(input, [], []);
		const commandsCount = (result.match(/## Commands/g) || []).length;
		expect(commandsCount).toBe(1);
	});
});

describe("getOptimizationStats", () => {
	it("should count vague patterns removed", () => {
		const original = "Write clean code. Follow best practices.";
		const optimized = "Prefer const. Run lint.";
		const stats = getOptimizationStats(original, optimized);
		expect(stats.vaguePatternsRemoved).toBeGreaterThan(0);
	});

	it("should count absolutes rewritten", () => {
		const original = "ALWAYS use TypeScript. NEVER use var.";
		const optimized = "Prefer to use TypeScript. Avoid var.";
		const stats = getOptimizationStats(original, optimized);
		expect(stats.absolutesRewritten).toBe(2);
	});

	it("should count lines added", () => {
		const original = "# Title";
		const optimized = "# Title\nLine 1\nLine 2";
		const stats = getOptimizationStats(original, optimized);
		expect(stats.linesAdded).toBe(2);
	});

	it("should count lines removed", () => {
		const original = "# Title\nLine 1\nLine 2";
		const optimized = "# Title";
		const stats = getOptimizationStats(original, optimized);
		expect(stats.linesRemoved).toBe(2);
	});

	it("should handle equal line counts", () => {
		const original = "# Title\nLine 1";
		const optimized = "# Title\nLine 2";
		const stats = getOptimizationStats(original, optimized);
		expect(stats.linesAdded).toBe(0);
		expect(stats.linesRemoved).toBe(0);
	});
});
