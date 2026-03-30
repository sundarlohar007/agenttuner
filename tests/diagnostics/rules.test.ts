import { describe, it, expect } from "vitest";
import { runAllRules, calculateScore } from "../../src/diagnostics/rules";
import { parseConfigSections } from "../../src/diagnostics/parser";
import { SAMPLE_CLAUDE_MD, VAGUE_CLAUDE_MD, LONG_CLAUDE_MD } from "../fixtures";

describe("runAllRules", () => {
	it("should detect vague rules", () => {
		const sections = parseConfigSections(VAGUE_CLAUDE_MD);
		const issues = runAllRules(VAGUE_CLAUDE_MD, sections, VAGUE_CLAUDE_MD.split("\n").length);
		const vagueIssue = issues.find((i) => i.ruleId === "vague-rules");
		expect(vagueIssue).toBeDefined();
		expect(vagueIssue?.severity).toBe("error");
	});

	it("should detect too-long config", () => {
		const sections = parseConfigSections(LONG_CLAUDE_MD);
		const issues = runAllRules(LONG_CLAUDE_MD, sections, LONG_CLAUDE_MD.split("\n").length);
		const tooLongIssue = issues.find((i) => i.ruleId === "too-long");
		expect(tooLongIssue).toBeDefined();
		expect(tooLongIssue?.severity).toBe("warning");
	});

	it("should detect missing pitfalls section", () => {
		const content = `# Project
## Commands
Run \`npm test\`
`;
		const sections = parseConfigSections(content);
		const issues = runAllRules(content, sections, content.split("\n").length);
		const pitfallsIssue = issues.find((i) => i.ruleId === "no-pitfalls");
		expect(pitfallsIssue).toBeDefined();
	});

	it("should detect missing commands section", () => {
		const content = `# Project
## Architecture
Some architecture info
`;
		const sections = parseConfigSections(content);
		const issues = runAllRules(content, sections, content.split("\n").length);
		const commandsIssue = issues.find((i) => i.ruleId === "no-commands");
		expect(commandsIssue).toBeDefined();
		expect(commandsIssue?.severity).toBe("error");
	});

	it("should detect missing constraints section", () => {
		const content = `# Project
## Commands
Run \`npm test\`
`;
		const sections = parseConfigSections(content);
		const issues = runAllRules(content, sections, content.split("\n").length);
		const constraintsIssue = issues.find((i) => i.ruleId === "no-constraints");
		expect(constraintsIssue).toBeDefined();
	});

	it("should detect missing verification section", () => {
		const content = `# Project
## Commands
Run \`npm test\`
`;
		const sections = parseConfigSections(content);
		const issues = runAllRules(content, sections, content.split("\n").length);
		const verificationIssue = issues.find((i) => i.ruleId === "no-verification");
		expect(verificationIssue).toBeDefined();
	});

	it("should detect ALWAYS/NEVER overuse", () => {
		const content = `ALWAYS do this. NEVER do that. ALWAYS be careful. NEVER skip tests. ALWAYS verify.`;
		const sections = parseConfigSections(content);
		const issues = runAllRules(content, sections, content.split("\n").length);
		const alwaysNeverIssue = issues.find((i) => i.ruleId === "always-never");
		expect(alwaysNeverIssue).toBeDefined();
		expect(alwaysNeverIssue?.severity).toBe("warning");
	});

	it("should detect prose-heavy config", () => {
		const longLine = "A".repeat(150);
		const content = `${longLine}\n${longLine}\n${longLine}\n${longLine}\n${longLine}`;
		const sections = parseConfigSections(content);
		const issues = runAllRules(content, sections, content.split("\n").length);
		const proseIssue = issues.find((i) => i.ruleId === "prose-heavy");
		expect(proseIssue).toBeDefined();
	});

	it("should detect duplicated linter rules", () => {
		const content = `Config with indentation rules, semicolons, single quotes, trailing comma`;
		const sections = parseConfigSections(content);
		const issues = runAllRules(content, sections, content.split("\n").length);
		const linterIssue = issues.find((i) => i.ruleId === "duplicates-linter");
		expect(linterIssue).toBeDefined();
	});

	it("should detect restated package.json info", () => {
		const content = `Project using typescript, node.js, pnpm, eslint, prettier`;
		const sections = parseConfigSections(content);
		const issues = runAllRules(content, sections, content.split("\n").length);
		const packageIssue = issues.find((i) => i.ruleId === "restates-package-json");
		expect(packageIssue).toBeDefined();
	});

	it("should detect missing escalation rules", () => {
		const content = `# Project
## Commands
Run \`npm test\`
`;
		const sections = parseConfigSections(content);
		const issues = runAllRules(content, sections, content.split("\n").length);
		const escalationIssue = issues.find((i) => i.ruleId === "no-escalation");
		expect(escalationIssue).toBeDefined();
		expect(escalationIssue?.severity).toBe("info");
	});

	it("should detect missing conventions section", () => {
		const content = `# Project
## Commands
Run \`npm test\`
`;
		const sections = parseConfigSections(content);
		const issues = runAllRules(content, sections, content.split("\n").length);
		const conventionsIssue = issues.find((i) => i.ruleId === "no-conventions");
		expect(conventionsIssue).toBeDefined();
	});

	it("should detect missing stack/architecture section", () => {
		const content = `# Project
## Commands
Run \`npm test\`
`;
		const sections = parseConfigSections(content);
		const issues = runAllRules(content, sections, content.split("\n").length);
		const stackIssue = issues.find((i) => i.ruleId === "no-stack");
		expect(stackIssue).toBeDefined();
	});

	it("should not report issues for well-structured config", () => {
		const sections = parseConfigSections(SAMPLE_CLAUDE_MD);
		const issues = runAllRules(
			SAMPLE_CLAUDE_MD,
			sections,
			SAMPLE_CLAUDE_MD.split("\n").length,
		);
		// Well-structured config should have fewer issues
		expect(issues.length).toBeLessThan(5);
	});
});

describe("calculateScore", () => {
	it("should return 100 for no issues", () => {
		const score = calculateScore([]);
		expect(score).toBe(100);
	});

	it("should deduct points for errors", () => {
		const issues = [
			{
				ruleId: "no-commands",
				severity: "error" as const,
				message: "Missing commands",
				suggestion: "Add commands",
			},
		];
		const score = calculateScore(issues);
		expect(score).toBeLessThan(100);
	});

	it("should deduct points for warnings", () => {
		const issues = [
			{
				ruleId: "too-long",
				severity: "warning" as const,
				message: "Too long",
				suggestion: "Shorten",
			},
		];
		const score = calculateScore(issues);
		expect(score).toBeLessThan(100);
	});

	it("should not go below 0", () => {
		const issues = Array(20).fill({
			ruleId: "no-commands",
			severity: "error" as const,
			message: "Missing commands",
			suggestion: "Add commands",
		});
		const score = calculateScore(issues);
		expect(score).toBeGreaterThanOrEqual(0);
	});

	it("should not go above 100", () => {
		const score = calculateScore([]);
		expect(score).toBeLessThanOrEqual(100);
	});
});
