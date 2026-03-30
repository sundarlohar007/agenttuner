import { describe, it, expect } from "vitest";
import { generateDiff, countChanges } from "../../src/optimizer/diff";

describe("generateDiff", () => {
	it("should generate diff for identical content", () => {
		const content = "Line 1\nLine 2\nLine 3";
		const diff = generateDiff(content, content, "test.txt");
		expect(diff).toContain("--- a/test.txt");
		expect(diff).toContain("+++ b/test.txt");
		// All lines should be context (unchanged)
		const lines = diff.split("\n").slice(2); // Skip header
		expect(lines.every((l) => l.startsWith(" ") || l === "")).toBe(true);
	});

	it("should generate diff for added lines", () => {
		const original = "Line 1\nLine 2";
		const modified = "Line 1\nLine 2\nLine 3";
		const diff = generateDiff(original, modified, "test.txt");
		expect(diff).toContain("+Line 3");
	});

	it("should generate diff for removed lines", () => {
		const original = "Line 1\nLine 2\nLine 3";
		const modified = "Line 1\nLine 2";
		const diff = generateDiff(original, modified, "test.txt");
		expect(diff).toContain("-Line 3");
	});

	it("should generate diff for modified lines", () => {
		const original = "Line 1\nLine 2\nLine 3";
		const modified = "Line 1\nModified Line 2\nLine 3";
		const diff = generateDiff(original, modified, "test.txt");
		expect(diff).toContain("-Line 2");
		expect(diff).toContain("+Modified Line 2");
	});

	it("should use default file path", () => {
		const diff = generateDiff("old", "new");
		expect(diff).toContain("--- a/CLAUDE.md");
		expect(diff).toContain("+++ b/CLAUDE.md");
	});

	it("should handle empty content", () => {
		const diff = generateDiff("", "");
		expect(diff).toContain("--- a/CLAUDE.md");
		expect(diff).toContain("+++ b/CLAUDE.md");
	});

	it("should handle completely different content", () => {
		const original = "A\nB\nC";
		const modified = "X\nY\nZ";
		const diff = generateDiff(original, modified, "test.txt");
		expect(diff).toContain("-A");
		expect(diff).toContain("+X");
		expect(diff).toContain("-B");
		expect(diff).toContain("+Y");
		expect(diff).toContain("-C");
		expect(diff).toContain("+Z");
	});
});

describe("countChanges", () => {
	it("should count additions and removals", () => {
		const diff = `--- a/test.txt
+++ b/test.txt
 Line 1
-Line 2
+Modified Line 2
+New Line 3
-Line 4`;
		const changes = countChanges(diff);
		expect(changes.added).toBe(2); // Modified Line 2, New Line 3
		expect(changes.removed).toBe(2); // Line 2, Line 4
	});

	it("should not count diff headers", () => {
		const diff = `--- a/test.txt
+++ b/test.txt
 Line 1
+Line 2`;
		const changes = countChanges(diff);
		expect(changes.added).toBe(1);
		expect(changes.removed).toBe(0);
	});

	it("should handle empty diff", () => {
		const changes = countChanges("");
		expect(changes.added).toBe(0);
		expect(changes.removed).toBe(0);
	});

	it("should handle diff with only context lines", () => {
		const diff = `--- a/test.txt
+++ b/test.txt
 Line 1
 Line 2
 Line 3`;
		const changes = countChanges(diff);
		expect(changes.added).toBe(0);
		expect(changes.removed).toBe(0);
	});

	it("should count multiple additions", () => {
		const diff = `--- a/test.txt
+++ b/test.txt
+Line 1
+Line 2
+Line 3`;
		const changes = countChanges(diff);
		expect(changes.added).toBe(3);
		expect(changes.removed).toBe(0);
	});

	it("should count multiple removals", () => {
		const diff = `--- a/test.txt
+++ b/test.txt
-Line 1
-Line 2
-Line 3`;
		const changes = countChanges(diff);
		expect(changes.added).toBe(0);
		expect(changes.removed).toBe(3);
	});
});
