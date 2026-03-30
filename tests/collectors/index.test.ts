import { describe, it, expect, vi } from "vitest";
import { detectAgents, collectAllSessions } from "../../src/collectors/index";

describe("detectAgents", () => {
	it("should return array of agent paths", () => {
		const agents = detectAgents();
		expect(Array.isArray(agents)).toBe(true);
		expect(agents.length).toBe(3);
	});

	it("should include claude-code agent", () => {
		const agents = detectAgents();
		const claude = agents.find((a) => a.agent === "claude-code");
		expect(claude).toBeDefined();
		expect(claude?.baseDir).toBeDefined();
		expect(typeof claude?.exists).toBe("boolean");
	});

	it("should include cursor agent", () => {
		const agents = detectAgents();
		const cursor = agents.find((a) => a.agent === "cursor");
		expect(cursor).toBeDefined();
		expect(cursor?.baseDir).toBeDefined();
		expect(typeof cursor?.exists).toBe("boolean");
	});

	it("should include codex agent", () => {
		const agents = detectAgents();
		const codex = agents.find((a) => a.agent === "codex");
		expect(codex).toBeDefined();
		expect(codex?.baseDir).toBeDefined();
		expect(typeof codex?.exists).toBe("boolean");
	});

	it("should have baseDir for each agent", () => {
		const agents = detectAgents();
		for (const agent of agents) {
			expect(agent.baseDir).toBeDefined();
			expect(typeof agent.baseDir).toBe("string");
			expect(agent.baseDir.length).toBeGreaterThan(0);
		}
	});
});

describe("collectAllSessions", () => {
	it("should collect sessions from all agents by default", async () => {
		const sessions = await collectAllSessions();
		expect(Array.isArray(sessions)).toBe(true);
	});

	it("should collect sessions from specific agents", async () => {
		const sessions = await collectAllSessions(["claude-code"]);
		expect(Array.isArray(sessions)).toBe(true);
	});

	it("should return empty array when no agents found", async () => {
		const sessions = await collectAllSessions([]);
		expect(sessions).toEqual([]);
	});

	it("should handle errors gracefully", async () => {
		// Should not throw even if agents don't exist
		const sessions = await collectAllSessions(["claude-code", "cursor", "codex"]);
		expect(Array.isArray(sessions)).toBe(true);
	});

	it("should return sessions with required fields", async () => {
		const sessions = await collectAllSessions(["claude-code"]);
		for (const session of sessions) {
			expect(session.agent).toBeDefined();
			expect(session.sessionId).toBeDefined();
			expect(session.messages).toBeDefined();
			expect(Array.isArray(session.messages)).toBe(true);
		}
	});
});
