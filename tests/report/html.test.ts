import { describe, it, expect } from "vitest";
import { generateHtmlReport } from "../../src/report/html";
import { createMockWastePattern } from "../fixtures";

describe("generateHtmlReport", () => {
	it("should generate HTML report with diagnostic data", () => {
		const diagnostic = {
			filePath: "CLAUDE.md",
			score: 85,
			issues: [
				{
					ruleId: "vague-rules",
					severity: "warning" as const,
					message: "Contains vague instructions",
					suggestion: "Be more specific",
				},
			],
			sections: [],
			missingSections: ["Commands"],
			lineCount: 50,
		};

		const html = generateHtmlReport(null, diagnostic);
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("AgentTuner Report");
		expect(html).toContain("85/100");
		expect(html).toContain("Contains vague instructions");
		expect(html).toContain("Commands");
	});

	it("should generate HTML report with analysis data", () => {
		const analysis = {
			sessions: [
				{
					sessionId: "session-1",
					agent: "claude-code",
					projectPath: "/test",
					totalTurns: 10,
					totalTokens: 5000,
					estimatedWastedTokens: 1000,
					wastePatterns: [createMockWastePattern()],
					toolCallBreakdown: { Read: 5, Bash: 3 },
					costEstimate: 0.15,
				},
			],
			totalSessions: 1,
			totalTokensUsed: 5000,
			estimatedWastedTokens: 1000,
			estimatedWastedCost: 0.05,
			topWasteCategories: [{ type: "repeated-read", count: 2, tokens: 1000 }],
		};

		const html = generateHtmlReport(analysis, null);
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("5.0K"); // Formatted token count
		expect(html).toContain("Repeated File Reads");
	});

	it("should generate HTML report with both analysis and diagnostic", () => {
		const diagnostic = {
			filePath: "CLAUDE.md",
			score: 75,
			issues: [],
			sections: [],
			missingSections: [],
			lineCount: 30,
		};

		const analysis = {
			sessions: [],
			totalSessions: 0,
			totalTokensUsed: 0,
			estimatedWastedTokens: 0,
			estimatedWastedCost: 0,
			topWasteCategories: [],
		};

		const html = generateHtmlReport(analysis, diagnostic);
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("75/100");
		expect(html).toContain("Session Analysis");
	});

	it("should handle null values", () => {
		const html = generateHtmlReport(null, null);
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("AgentTuner Report");
	});

	it("should include proper styling", () => {
		const html = generateHtmlReport(null, null);
		expect(html).toContain("<style>");
		expect(html).toContain("background: #0f172a");
		expect(html).toContain("font-family:");
	});

	it("should format large numbers correctly", () => {
		const analysis = {
			sessions: [],
			totalSessions: 0,
			totalTokensUsed: 1500000,
			estimatedWastedTokens: 500000,
			estimatedWastedCost: 10.5,
			topWasteCategories: [],
		};

		const html = generateHtmlReport(analysis, null);
		expect(html).toContain("1.5M");
		expect(html).toContain("500.0K");
	});

	it("should color score based on value", () => {
		const highScore = {
			filePath: "CLAUDE.md",
			score: 90,
			issues: [],
			sections: [],
			missingSections: [],
			lineCount: 30,
		};

		const lowScore = {
			filePath: "CLAUDE.md",
			score: 30,
			issues: [],
			sections: [],
			missingSections: [],
			lineCount: 30,
		};

		const highHtml = generateHtmlReport(null, highScore);
		const lowHtml = generateHtmlReport(null, lowScore);

		expect(highHtml).toContain("#22c55e"); // Green
		expect(lowHtml).toContain("#ef4444"); // Red
	});

	it("should include issue severity badges", () => {
		const diagnostic = {
			filePath: "CLAUDE.md",
			score: 50,
			issues: [
				{
					ruleId: "test",
					severity: "error" as const,
					message: "Error message",
					suggestion: "Fix it",
				},
				{
					ruleId: "test2",
					severity: "warning" as const,
					message: "Warning message",
					suggestion: "Fix it",
				},
			],
			sections: [],
			missingSections: [],
			lineCount: 30,
		};

		const html = generateHtmlReport(null, diagnostic);
		expect(html).toContain("error");
		expect(html).toContain("warning");
		expect(html).toContain("Error message");
		expect(html).toContain("Warning message");
	});
});
