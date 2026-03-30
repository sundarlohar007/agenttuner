import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { diagnoseConfig, diagnoseConfigContent } from "../../src/diagnostics/index";
import { SAMPLE_CLAUDE_MD, VAGUE_CLAUDE_MD } from "../fixtures";

const TEST_DIR = join(process.cwd(), ".test-diagnostics");

describe("diagnoseConfig", () => {
	beforeEach(() => {
		mkdirSync(TEST_DIR, { recursive: true });
	});

	afterEach(() => {
		rmSync(TEST_DIR, { recursive: true, force: true });
	});

	it("should diagnose a config file", () => {
		const filePath = join(TEST_DIR, "CLAUDE.md");
		writeFileSync(filePath, SAMPLE_CLAUDE_MD);

		const result = diagnoseConfig(filePath);
		expect(result.filePath).toBe(filePath);
		expect(result.score).toBeGreaterThan(0);
		expect(result.score).toBeLessThanOrEqual(100);
		expect(result.issues).toBeDefined();
		expect(result.sections).toBeDefined();
		expect(result.lineCount).toBeGreaterThan(0);
	});

	it("should detect issues in vague config", () => {
		const filePath = join(TEST_DIR, "vague.md");
		writeFileSync(filePath, VAGUE_CLAUDE_MD);

		const result = diagnoseConfig(filePath);
		expect(result.issues.length).toBeGreaterThan(0);
		const vagueIssue = result.issues.find((i) => i.ruleId === "vague-rules");
		expect(vagueIssue).toBeDefined();
	});

	it("should identify sections correctly", () => {
		const filePath = join(TEST_DIR, "sections.md");
		writeFileSync(filePath, SAMPLE_CLAUDE_MD);

		const result = diagnoseConfig(filePath);
		expect(result.sections.length).toBeGreaterThan(0);
		const sectionNames = result.sections.map((s) => s.name);
		expect(sectionNames).toContain("Architecture");
		expect(sectionNames).toContain("Commands");
	});

	it("should identify missing sections", () => {
		const filePath = join(TEST_DIR, "missing.md");
		const content = `# Project
## Commands
Run \`npm test\`
`;
		writeFileSync(filePath, content);

		const result = diagnoseConfig(filePath);
		expect(result.missingSections.length).toBeGreaterThan(0);
	});

	it("should calculate score based on issues", () => {
		const filePath = join(TEST_DIR, "score.md");
		writeFileSync(filePath, SAMPLE_CLAUDE_MD);

		const result = diagnoseConfig(filePath);
		expect(result.score).toBeGreaterThan(0);
		expect(result.score).toBeLessThanOrEqual(100);
	});
});

describe("diagnoseConfigContent", () => {
	it("should diagnose config content", () => {
		const result = diagnoseConfigContent(SAMPLE_CLAUDE_MD, "test.md");
		expect(result.filePath).toBe("test.md");
		expect(result.score).toBeGreaterThan(0);
		expect(result.issues).toBeDefined();
		expect(result.sections).toBeDefined();
	});

	it("should use default file path", () => {
		const result = diagnoseConfigContent(SAMPLE_CLAUDE_MD);
		expect(result.filePath).toBe("CLAUDE.md");
	});

	it("should detect vague rules in content", () => {
		const result = diagnoseConfigContent(VAGUE_CLAUDE_MD);
		const vagueIssue = result.issues.find((i) => i.ruleId === "vague-rules");
		expect(vagueIssue).toBeDefined();
	});

	it("should detect missing sections in content", () => {
		const content = `# Project
Some content without proper sections
`;
		const result = diagnoseConfigContent(content);
		expect(result.missingSections.length).toBeGreaterThan(0);
	});

	it("should handle empty content", () => {
		const result = diagnoseConfigContent("");
		expect(result.score).toBeGreaterThanOrEqual(0);
		expect(result.sections).toEqual([]);
	});

	it("should count lines correctly", () => {
		const content = "Line 1\nLine 2\nLine 3";
		const result = diagnoseConfigContent(content);
		expect(result.lineCount).toBe(3);
	});
});
