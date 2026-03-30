import { describe, it, expect } from "vitest";
import {
	rewriteVagueInstructions,
	rewriteAbsolutes,
	countVaguePatterns,
	countAbsolutes,
} from "../../src/optimizer/patterns";

describe("rewriteVagueInstructions", () => {
	it("should rewrite 'write clean code'", () => {
		const input = "Always write clean code in this project.";
		const result = rewriteVagueInstructions(input);
		expect(result).not.toContain("write clean code");
		expect(result).toContain("const");
	});

	it("should rewrite 'follow best practices'", () => {
		const input = "You should follow best practices always.";
		const result = rewriteVagueInstructions(input);
		expect(result).not.toContain("follow best practices");
		expect(result).toContain("lint");
	});

	it("should rewrite 'ensure proper error handling'", () => {
		const input = "Please ensure proper error handling throughout.";
		const result = rewriteVagueInstructions(input);
		expect(result).not.toContain("ensure proper error handling");
		expect(result).toContain("try/catch");
	});

	it("should rewrite 'be careful with async'", () => {
		const input = "Be careful with async operations.";
		const result = rewriteVagueInstructions(input);
		expect(result).not.toContain("Be careful with async");
		expect(result).toContain("async/await");
	});

	it("should rewrite 'make sure to handle edge cases'", () => {
		const input = "Make sure to handle all edge cases.";
		const result = rewriteVagueInstructions(input);
		expect(result).not.toContain("Make sure to handle all edge cases");
		expect(result).toContain("test");
	});

	it("should rewrite 'use meaningful names'", () => {
		const input = "Use meaningful variable names throughout the codebase.";
		const result = rewriteVagueInstructions(input);
		expect(result).not.toContain("Use meaningful variable names");
		expect(result).toContain("userName");
	});

	it("should rewrite 'write comprehensive tests'", () => {
		const input = "Write comprehensive tests for new features.";
		const result = rewriteVagueInstructions(input);
		expect(result).not.toContain("Write comprehensive tests");
	});

	it("should handle case insensitive matching", () => {
		const input = "WRITE CLEAN CODE and FOLLOW BEST PRACTICES";
		const result = rewriteVagueInstructions(input);
		expect(result).not.toContain("WRITE CLEAN CODE");
		expect(result).not.toContain("FOLLOW BEST PRACTICES");
	});

	it("should preserve non-vague content", () => {
		const input = "Run `npm test` to verify changes.";
		const result = rewriteVagueInstructions(input);
		expect(result).toContain("Run `npm test`");
		expect(result).toContain("verify changes");
	});

	it("should handle multiple vague patterns", () => {
		const input = "Write clean code. Follow best practices. Be consistent.";
		const result = rewriteVagueInstructions(input);
		expect(result).not.toContain("Write clean code");
		expect(result).not.toContain("Follow best practices");
		expect(result).not.toContain("Be consistent");
	});
});

describe("rewriteAbsolutes", () => {
	it("should replace ALWAYS with Prefer to", () => {
		const input = "ALWAYS use TypeScript strict mode.";
		const result = rewriteAbsolutes(input);
		expect(result).toContain("Prefer to");
		expect(result).not.toContain("ALWAYS");
	});

	it("should replace NEVER with Avoid", () => {
		const input = "NEVER use var declarations.";
		const result = rewriteAbsolutes(input);
		expect(result).toContain("Avoid");
		expect(result).not.toContain("NEVER");
	});

	it("should handle multiple absolutes", () => {
		const input = "ALWAYS write tests. NEVER skip the linter.";
		const result = rewriteAbsolutes(input);
		expect(result).toContain("Prefer to");
		expect(result).toContain("Avoid");
	});

	it("should preserve lowercase always/never", () => {
		const input = "Always try your best. Never give up.";
		const result = rewriteAbsolutes(input);
		expect(result).toContain("Always");
		expect(result).toContain("Never");
	});
});

describe("countVaguePatterns", () => {
	it("should count vague patterns", () => {
		const input = "Write clean code. Follow best practices.";
		const count = countVaguePatterns(input);
		expect(count).toBeGreaterThan(0);
	});

	it("should return 0 for no vague patterns", () => {
		const input = "Run `npm test` to verify changes.";
		const count = countVaguePatterns(input);
		expect(count).toBe(0);
	});

	it("should count multiple occurrences", () => {
		const input = "Write clean code. Write quality code. Write maintainable code.";
		const count = countVaguePatterns(input);
		expect(count).toBeGreaterThan(0);
	});
});

describe("countAbsolutes", () => {
	it("should count ALWAYS", () => {
		const input = "ALWAYS use TypeScript. ALWAYS write tests.";
		const count = countAbsolutes(input);
		expect(count).toBe(2);
	});

	it("should count NEVER", () => {
		const input = "NEVER use var. NEVER skip linting.";
		const count = countAbsolutes(input);
		expect(count).toBe(2);
	});

	it("should count both ALWAYS and NEVER", () => {
		const input = "ALWAYS test. NEVER skip.";
		const count = countAbsolutes(input);
		expect(count).toBe(2);
	});

	it("should return 0 for no absolutes", () => {
		const input = "Run tests. Check linting.";
		const count = countAbsolutes(input);
		expect(count).toBe(0);
	});
});
