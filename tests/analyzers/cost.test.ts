import { describe, it, expect } from "vitest";
import { analyzeCosts } from "../../src/analyzers/cost";
import { createMockSession, createMockMessage } from "../fixtures";

describe("analyzeCosts", () => {
	it("should calculate total tokens correctly", () => {
		const session = createMockSession({
			totalInputTokens: 1000,
			totalOutputTokens: 500,
			messages: [
				createMockMessage({ role: "assistant", content: "Response" }),
			],
		});

		const result = analyzeCosts(session);
		expect(result.totalTokens).toBe(1500);
		expect(result.totalInputTokens).toBe(1000);
		expect(result.totalOutputTokens).toBe(500);
	});

	it("should calculate cost estimate", () => {
		const session = createMockSession({
			totalInputTokens: 1000000,
			totalOutputTokens: 1000000,
			messages: [
				createMockMessage({ role: "assistant", content: "Response" }),
			],
		});

		const result = analyzeCosts(session);
		// Cost should be positive
		expect(result.costEstimate).toBeGreaterThan(0);
		// Should be reasonable (not zero, not astronomical)
		expect(result.costEstimate).toBeGreaterThan(0);
		expect(result.costEstimate).toBeLessThan(100);
	});

	it("should count tool calls correctly", () => {
		const session = createMockSession({
			totalInputTokens: 1000,
			totalOutputTokens: 500,
			messages: [
				createMockMessage({
					role: "assistant",
					content: "Response",
					toolCalls: [
						{ name: "Read", input: { file_path: "/test.ts" } },
						{ name: "Read", input: { file_path: "/test2.ts" } },
						{ name: "Bash", input: { command: "npm test" } },
					],
				}),
			],
		});

		const result = analyzeCosts(session);
		expect(result.toolCallBreakdown["Read"]).toBe(2);
		expect(result.toolCallBreakdown["Bash"]).toBe(1);
	});

	it("should count turns without tools", () => {
		const session = createMockSession({
			totalInputTokens: 1000,
			totalOutputTokens: 500,
			messages: [
				createMockMessage({
					role: "assistant",
					content: "No tools",
					toolCalls: undefined,
				}),
				createMockMessage({
					role: "assistant",
					content: "Still no tools",
					toolCalls: undefined,
				}),
				createMockMessage({
					role: "assistant",
					content: "With tools",
					toolCalls: [{ name: "Read", input: { file_path: "/test.ts" } }],
				}),
			],
		});

		const result = analyzeCosts(session);
		expect(result.turnsWithNoTools).toBe(2);
	});

	it("should calculate average tokens per turn", () => {
		const session = createMockSession({
			totalInputTokens: 1000,
			totalOutputTokens: 500,
			messages: [
				createMockMessage({ role: "assistant", content: "Response 1" }),
				createMockMessage({ role: "assistant", content: "Response 2" }),
			],
		});

		const result = analyzeCosts(session);
		// 1500 tokens / 2 turns = 750
		expect(result.avgTokensPerTurn).toBe(750);
	});

	it("should handle empty session", () => {
		const session = createMockSession({
			totalInputTokens: 0,
			totalOutputTokens: 0,
			messages: [],
		});

		const result = analyzeCosts(session);
		expect(result.totalTokens).toBe(0);
		expect(result.costEstimate).toBe(0);
		expect(result.avgTokensPerTurn).toBe(0);
	});

	it("should handle session with no assistant messages", () => {
		const session = createMockSession({
			totalInputTokens: 0,
			totalOutputTokens: 0,
			messages: [
				createMockMessage({ role: "user", content: "User message" }),
			],
		});

		const result = analyzeCosts(session);
		expect(result.totalTokens).toBe(0);
		expect(result.turnsWithNoTools).toBe(0);
	});
});
