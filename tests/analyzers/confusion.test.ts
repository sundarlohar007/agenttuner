import { describe, it, expect } from "vitest";
import { detectConfusionPatterns } from "../../src/analyzers/confusion";
import { createMockSession, createMockMessage } from "../fixtures";

describe("detectConfusionPatterns", () => {
	it("should detect confusion with 'let me check'", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					content: "Let me check the file structure first",
				}),
			],
		});

		const result = detectConfusionPatterns(session);
		expect(result).toBeDefined();
		expect(result?.type).toBe("exploration-loop");
		expect(result?.occurrences).toBe(1);
	});

	it("should detect confusion with 'let me understand'", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					content: "Let me understand the project structure",
				}),
			],
		});

		const result = detectConfusionPatterns(session);
		expect(result).toBeDefined();
		expect(result?.type).toBe("exploration-loop");
	});

	it("should detect confusion with 'could you clarify'", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					content: "Could you clarify what you mean by this?",
				}),
			],
		});

		const result = detectConfusionPatterns(session);
		expect(result).toBeDefined();
		expect(result?.type).toBe("exploration-loop");
	});

	it("should detect confusion with 'could you clarify'", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					content: "Could you clarify what you mean?",
				}),
			],
		});

		const result = detectConfusionPatterns(session);
		expect(result).toBeDefined();
		expect(result?.type).toBe("exploration-loop");
	});

	it("should detect confusion with 'where is'", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					content: "Where is the main entry point?",
				}),
			],
		});

		const result = detectConfusionPatterns(session);
		expect(result).toBeDefined();
		expect(result?.type).toBe("exploration-loop");
	});

	it("should detect multiple confusion instances", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					content: "Let me check the structure",
				}),
				createMockMessage({
					role: "assistant",
					content: "Let me understand the codebase",
				}),
				createMockMessage({
					role: "assistant",
					content: "Where is the configuration?",
				}),
			],
		});

		const result = detectConfusionPatterns(session);
		expect(result).toBeDefined();
		expect(result?.occurrences).toBe(3);
	});

	it("should return null for confident responses", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					content: "I found the issue and fixed it by updating the configuration",
				}),
			],
		});

		const result = detectConfusionPatterns(session);
		expect(result).toBeNull();
	});

	it("should return null for empty session", () => {
		const session = createMockSession({ messages: [] });
		const result = detectConfusionPatterns(session);
		expect(result).toBeNull();
	});

	it("should set severity based on occurrence count", () => {
		const fewConfusions = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					content: "Let me check",
				}),
			],
		});

		const manyConfusions = createMockSession({
			messages: [
				createMockMessage({ role: "assistant", content: "Let me check" }),
				createMockMessage({ role: "assistant", content: "Let me understand" }),
				createMockMessage({ role: "assistant", content: "Where is it?" }),
				createMockMessage({ role: "assistant", content: "Could you clarify this?" }),
			],
		});

		const fewResult = detectConfusionPatterns(fewConfusions);
		const manyResult = detectConfusionPatterns(manyConfusions);

		expect(fewResult?.severity).toBe("medium");
		// 4 occurrences > 3, so severity should be "high"
		expect(manyResult?.severity).toBe("high");
	});

	it("should provide fix suggestion", () => {
		const session = createMockSession({
			messages: [
				createMockMessage({
					role: "assistant",
					content: "Let me check the structure",
				}),
			],
		});

		const result = detectConfusionPatterns(session);
		expect(result?.fixSuggestion).toContain("Architecture");
	});
});
