import { describe, it, expect } from "vitest";
import {
	detectRepeatedReads,
	detectRepeatedCommands,
	detectEmptyResults,
	detectLargeIgnoredOutputs,
	detectAllPatterns,
} from "../../src/analyzers/loops";
import { createMockSession, createMockMessage } from "../fixtures";

describe("detectRepeatedReads", () => {
	it("should detect repeated file reads", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Read", input: { file_path: "/test/file.ts" } }],
				}),
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Read", input: { file_path: "/test/file.ts" } }],
				}),
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Read", input: { file_path: "/test/file.ts" } }],
				}),
			],
		});

		const result = detectRepeatedReads(session);
		expect(result).toBeDefined();
		expect(result?.type).toBe("repeated-read");
		expect(result?.occurrences).toBeGreaterThan(0);
	});

	it("should return null for unique reads", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Read", input: { file_path: "/test/file1.ts" } }],
				}),
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Read", input: { file_path: "/test/file2.ts" } }],
				}),
			],
		});

		const result = detectRepeatedReads(session);
		expect(result).toBeNull();
	});

	it("should handle read_file tool name", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "read_file", input: { path: "/test/file.ts" } }],
				}),
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "read_file", input: { path: "/test/file.ts" } }],
				}),
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "read_file", input: { path: "/test/file.ts" } }],
				}),
			],
		});

		const result = detectRepeatedReads(session);
		expect(result).toBeDefined();
		expect(result?.type).toBe("repeated-read");
	});

	it("should handle messages without toolCalls", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({ role: "assistant", content: "No tools" }),
				createMockMessage({ role: "assistant", content: "Still no tools" }),
			],
		});

		const result = detectRepeatedReads(session);
		expect(result).toBeNull();
	});
});

describe("detectRepeatedCommands", () => {
	it("should detect repeated command executions", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Bash", input: { command: "npm test" } }],
				}),
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Bash", input: { command: "npm test" } }],
				}),
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Bash", input: { command: "npm test" } }],
				}),
			],
		});

		const result = detectRepeatedCommands(session);
		expect(result).toBeDefined();
		expect(result?.type).toBe("repeated-command");
		expect(result?.occurrences).toBeGreaterThan(0);
	});

	it("should return null for unique commands", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Bash", input: { command: "npm test" } }],
				}),
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Bash", input: { command: "npm build" } }],
				}),
			],
		});

		const result = detectRepeatedCommands(session);
		expect(result).toBeNull();
	});

	it("should handle exec_command tool name", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "exec_command", input: { command: "npm test" } }],
				}),
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "exec_command", input: { command: "npm test" } }],
				}),
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "exec_command", input: { command: "npm test" } }],
				}),
			],
		});

		const result = detectRepeatedCommands(session);
		expect(result).toBeDefined();
		expect(result?.type).toBe("repeated-command");
	});
});

describe("detectEmptyResults", () => {
	it("should detect empty tool results", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Glob", input: { pattern: "*.ts" }, output: "" }],
				}),
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Grep", input: { pattern: "test" }, output: "" }],
				}),
			],
		});

		const result = detectEmptyResults(session);
		expect(result).toBeDefined();
		expect(result?.type).toBe("empty-tool-result");
		expect(result?.occurrences).toBe(2);
	});

	it("should not count Write/Edit tools with empty output", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Write", input: { file_path: "/test.ts" }, output: "" }],
				}),
			],
		});

		const result = detectEmptyResults(session);
		expect(result).toBeNull();
	});

	it("should return null for non-empty results", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Glob", input: { pattern: "*.ts" }, output: "file1.ts\nfile2.ts" }],
				}),
			],
		});

		const result = detectEmptyResults(session);
		expect(result).toBeNull();
	});
});

describe("detectLargeIgnoredOutputs", () => {
	it("should detect large outputs followed by short responses", () => {
		const largeOutput = "A".repeat(6000);
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Read", input: { file_path: "/large.ts" }, output: largeOutput }],
				}),
				createMockMessage({
					role: "assistant",
					content: "OK",
				}),
			],
		});

		const result = detectLargeIgnoredOutputs(session);
		expect(result).toBeDefined();
		expect(result?.type).toBe("large-output-ignored");
	});

	it("should not detect when response is substantial", () => {
		const largeOutput = "A".repeat(6000);
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Read", input: { file_path: "/large.ts" }, output: largeOutput }],
				}),
				createMockMessage({
					role: "assistant",
					content: "This is a detailed analysis of the file content that shows the agent actually processed the large output and provided meaningful feedback.",
				}),
			],
		});

		const result = detectLargeIgnoredOutputs(session);
		expect(result).toBeNull();
	});

	it("should return null for small outputs", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Read", input: { file_path: "/small.ts" }, output: "Small" }],
				}),
			],
		});

		const result = detectLargeIgnoredOutputs(session);
		expect(result).toBeNull();
	});
});

describe("detectAllPatterns", () => {
	it("should detect all waste patterns in a session", () => {
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
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Bash", input: { command: "npm test" } }],
				}),
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Bash", input: { command: "npm test" } }],
				}),
				createMockMessage({
					role: "assistant",
					toolCalls: [{ name: "Bash", input: { command: "npm test" } }],
				}),
			],
		});

		const patterns = detectAllPatterns(session);
		expect(patterns.length).toBeGreaterThan(0);
		const types = patterns.map((p) => p.type);
		expect(types).toContain("repeated-read");
		expect(types).toContain("repeated-command");
	});

	it("should return empty array for clean session", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					content: "Clean response",
					toolCalls: [{ name: "Read", input: { file_path: "/test.ts" } }],
				}),
			],
		});

		const patterns = detectAllPatterns(session);
		expect(patterns).toEqual([]);
	});
});
