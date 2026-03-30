import { describe, it, expect } from "vitest";
import {
	detectExplorationLoops,
	detectFileChurn,
	detectIdleTurns,
	detectAllWastePatterns,
} from "../../src/analyzers/waste";
import { createMockSession, createMockMessage } from "../fixtures";

describe("detectExplorationLoops", () => {
	it("should detect exploration loops with multiple Glob calls", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					toolCalls: [
						{ name: "Glob", input: { pattern: "*.ts" } },
						{ name: "Glob", input: { pattern: "*.js" } },
						{ name: "Glob", input: { pattern: "*.json" } },
					],
				}),
			],
		});

		const result = detectExplorationLoops(session);
		expect(result).toBeDefined();
		expect(result?.type).toBe("exploration-loop");
		expect(result?.occurrences).toBe(1);
	});

	it("should detect exploration loops with ls commands", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					toolCalls: [
						{ name: "Bash", input: { command: "ls -la" } },
						{ name: "Bash", input: { command: "ls src" } },
						{ name: "Bash", input: { command: "ls tests" } },
					],
				}),
			],
		});

		const result = detectExplorationLoops(session);
		expect(result).toBeDefined();
		expect(result?.type).toBe("exploration-loop");
	});

	it("should not detect exploration for minimal tool use", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Glob", input: { pattern: "*.ts" } }],
				}),
			],
		});

		const result = detectExplorationLoops(session);
		expect(result).toBeNull();
	});

	it("should return null for empty session", () => {
		const session = createMockSession({ messages: [] });
		const result = detectExplorationLoops(session);
		expect(result).toBeNull();
	});
});

describe("detectFileChurn", () => {
	it("should detect file churn (write then immediate edit)", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Write", input: { file_path: "/test.ts" } }],
				}),
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Edit", input: { file_path: "/test.ts" } }],
				}),
			],
		});

		const result = detectFileChurn(session);
		expect(result).toBeDefined();
		expect(result?.type).toBe("file-churn");
		expect(result?.occurrences).toBe(1);
	});

	it("should not detect churn when edit is far from write", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Write", input: { file_path: "/test.ts" } }],
				}),
				// Several messages in between
				...Array(5).fill(
					createMockMessage({
						role: "assistant",
						content: "Some work",
					}),
				),
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Edit", input: { file_path: "/test.ts" } }],
				}),
			],
		});

		const result = detectFileChurn(session);
		expect(result).toBeNull();
	});

	it("should return null when no file actions", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					content: "Just text",
				}),
			],
		});

		const result = detectFileChurn(session);
		expect(result).toBeNull();
	});
});

describe("detectIdleTurns", () => {
	it("should detect idle turns with short responses", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					content: "OK",
					toolCalls: undefined,
					tokenUsage: { input: 100, output: 50 },
				}),
				createMockMessage({
					role: "assistant",
					content: "Done",
					toolCalls: undefined,
					tokenUsage: { input: 100, output: 50 },
				}),
			],
		});

		const result = detectIdleTurns(session);
		expect(result).toBeDefined();
		expect(result?.type).toBe("idle-turn");
		expect(result?.occurrences).toBe(2);
	});

	it("should not detect idle turns with tool calls", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					content: "OK",
					toolCalls: [{ name: "Read", input: { file_path: "/test.ts" } }],
					tokenUsage: { input: 100, output: 50 },
				}),
			],
		});

		const result = detectIdleTurns(session);
		expect(result).toBeNull();
	});

	it("should not detect idle turns with long content", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					content: "This is a detailed response that explains what was done and why",
					tokenUsage: { input: 100, output: 200 },
				}),
			],
		});

		const result = detectIdleTurns(session);
		expect(result).toBeNull();
	});

	it("should return null for empty session", () => {
		const session = createMockSession({ messages: [] });
		const result = detectIdleTurns(session);
		expect(result).toBeNull();
	});
});

describe("detectAllWastePatterns", () => {
	it("should detect all waste patterns", () => {
		const session = createMockSession({
			messages: [
				// Exploration loop
				createMockMessage({
					role: "assistant",
					toolCalls: [
						{ name: "Glob", input: { pattern: "*.ts" } },
						{ name: "Glob", input: { pattern: "*.js" } },
						{ name: "Glob", input: { pattern: "*.json" } },
					],
				}),
				// File churn
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Write", input: { file_path: "/test.ts" } }],
				}),
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Edit", input: { file_path: "/test.ts" } }],
				}),
				// Idle turn
				createMockMessage({
					role: "assistant",
					content: "OK",
					toolCalls: undefined,
					tokenUsage: { input: 100, output: 50 },
				}),
			],
		});

		const patterns = detectAllWastePatterns(session);
		expect(patterns.length).toBeGreaterThan(0);
		const types = patterns.map((p) => p.type);
		expect(types).toContain("exploration-loop");
		expect(types).toContain("file-churn");
		expect(types).toContain("idle-turn");
	});

	it("should return empty array for clean session", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					content: "Detailed response",
					toolCalls: [{ name: "Read", input: { file_path: "/test.ts" } }],
				}),
			],
		});

		const patterns = detectAllWastePatterns(session);
		expect(patterns).toEqual([]);
	});
});
