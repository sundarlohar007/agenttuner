import { describe, it, expect } from "vitest";
import { analyzeSession, analyzeAllSessions } from "../../src/analyzers/index";
import { createMockSession, createMockMessage, createMockWastePattern } from "../fixtures";

describe("analyzeSession", () => {
	it("should analyze a session and return results", () => {
		const session = createMockSession({
			totalInputTokens: 1000,
			totalOutputTokens: 500,
			messages: [
				createMockMessage({
					role: "assistant",
					content: "Response",
					toolCalls: [{ name: "Read", input: { file_path: "/test.ts" } }],
				}),
			],
		});

		const result = analyzeSession(session);
		expect(result.sessionId).toBe("test-session-1");
		expect(result.agent).toBe("claude-code");
		expect(result.totalTokens).toBe(1500);
		expect(result.totalTurns).toBe(1);
		expect(result.wastePatterns).toBeDefined();
		expect(result.toolCallBreakdown).toBeDefined();
		expect(result.costEstimate).toBeGreaterThan(0);
	});

	it("should detect waste patterns in session", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					toolCalls: [
						{ name: "Read", input: { file_path: "/test.ts" } },
						{ name: "Read", input: { file_path: "/test.ts" } },
						{ name: "Read", input: { file_path: "/test.ts" } },
					],
				}),
			],
		});

		const result = analyzeSession(session);
		expect(result.wastePatterns.length).toBeGreaterThan(0);
		expect(result.estimatedWastedTokens).toBeGreaterThan(0);
	});

	it("should count assistant turns correctly", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({ role: "user", content: "User message" }),
				createMockMessage({ role: "assistant", content: "Response 1" }),
				createMockMessage({ role: "user", content: "Another user message" }),
				createMockMessage({ role: "assistant", content: "Response 2" }),
			],
		});

		const result = analyzeSession(session);
		expect(result.totalTurns).toBe(2);
	});
});

describe("analyzeAllSessions", () => {
	it("should analyze multiple sessions", () => {
		const sessions = [
			createMockSession({
				sessionId: "session-1",
				totalInputTokens: 1000,
				totalOutputTokens: 500,
				messages: [createMockMessage({ role: "assistant", content: "Response 1" })],
			}),
			createMockSession({
				sessionId: "session-2",
				totalInputTokens: 2000,
				totalOutputTokens: 1000,
				messages: [createMockMessage({ role: "assistant", content: "Response 2" })],
			}),
		];

		const result = analyzeAllSessions(sessions);
		expect(result.totalSessions).toBe(2);
		expect(result.totalTokensUsed).toBe(4500);
		expect(result.sessions.length).toBe(2);
		expect(result.topWasteCategories).toBeDefined();
	});

	it("should aggregate waste categories", () => {
		const sessions = [
			createMockSession({
				messages: [
					createMockMessage({
						role: "assistant",
						toolCalls: [
							{ name: "Read", input: { file_path: "/test.ts" } },
							{ name: "Read", input: { file_path: "/test.ts" } },
							{ name: "Read", input: { file_path: "/test.ts" } },
						],
					}),
				],
			}),
		];

		const result = analyzeAllSessions(sessions);
		expect(result.topWasteCategories.length).toBeGreaterThan(0);
		const repeatedReadCategory = result.topWasteCategories.find(
			(c) => c.type === "repeated-read",
		);
		expect(repeatedReadCategory).toBeDefined();
	});

	it("should calculate estimated wasted cost", () => {
		const sessions = [
			createMockSession({
				messages: [
					createMockMessage({
						role: "assistant",
						toolCalls: [
							{ name: "Read", input: { file_path: "/test.ts" } },
							{ name: "Read", input: { file_path: "/test.ts" } },
							{ name: "Read", input: { file_path: "/test.ts" } },
						],
					}),
				],
			}),
		];

		const result = analyzeAllSessions(sessions);
		expect(result.estimatedWastedCost).toBeGreaterThan(0);
	});

	it("should handle empty sessions array", () => {
		const result = analyzeAllSessions([]);
		expect(result.totalSessions).toBe(0);
		expect(result.totalTokensUsed).toBe(0);
		expect(result.estimatedWastedTokens).toBe(0);
		expect(result.estimatedWastedCost).toBe(0);
		expect(result.sessions).toEqual([]);
		expect(result.topWasteCategories).toEqual([]);
	});

	it("should sort waste categories by tokens", () => {
		const sessions = [
			createMockSession({
				messages: [
					createMockMessage({
						role: "assistant",
						toolCalls: [
							{ name: "Read", input: { file_path: "/test.ts" } },
							{ name: "Read", input: { file_path: "/test.ts" } },
							{ name: "Read", input: { file_path: "/test.ts" } },
						],
					}),
					createMockMessage({
						role: "assistant",
						toolCalls: [
							{ name: "Bash", input: { command: "npm test" } },
							{ name: "Bash", input: { command: "npm test" } },
							{ name: "Bash", input: { command: "npm test" } },
						],
					}),
				],
			}),
		];

		const result = analyzeAllSessions(sessions);
		if (result.topWasteCategories.length > 1) {
			for (let i = 0; i < result.topWasteCategories.length - 1; i++) {
				expect(result.topWasteCategories[i]?.tokens).toBeGreaterThanOrEqual(
					result.topWasteCategories[i + 1]?.tokens ?? 0,
				);
			}
		}
	});
});
