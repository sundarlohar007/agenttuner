import { describe, it, expect, vi } from "vitest";
import { detectAgents, collectAllSessions } from "../../src/collectors/index";
import { AGENT_TYPES } from "../../src/collectors/types";

describe("detectAgents", () => {
	it("should return array of all agent paths", () => {
		const agents = detectAgents();
		expect(Array.isArray(agents)).toBe(true);
		expect(agents.length).toBe(AGENT_TYPES.length);
	});

	it("should include all agent types", () => {
		const agents = detectAgents();
		const agentTypes = agents.map((a) => a.agent);
		for (const type of AGENT_TYPES) {
			expect(agentTypes).toContain(type);
		}
	});

	it("should have baseDir for each agent", () => {
		const agents = detectAgents();
		for (const agent of agents) {
			expect(agent.baseDir).toBeDefined();
			expect(typeof agent.baseDir).toBe("string");
			expect(agent.baseDir.length).toBeGreaterThan(0);
		}
	});

	it("should have exists boolean for each agent", () => {
		const agents = detectAgents();
		for (const agent of agents) {
			expect(typeof agent.exists).toBe("boolean");
		}
	});

	it("should include claude-code agent", () => {
		const agents = detectAgents();
		const claude = agents.find((a) => a.agent === "claude-code");
		expect(claude).toBeDefined();
		expect(claude?.baseDir).toContain(".claude");
	});

	it("should include cursor agent", () => {
		const agents = detectAgents();
		const cursor = agents.find((a) => a.agent === "cursor");
		expect(cursor).toBeDefined();
		expect(cursor?.baseDir).toContain("Cursor");
	});

	it("should include windsurf agent", () => {
		const agents = detectAgents();
		const windsurf = agents.find((a) => a.agent === "windsurf");
		expect(windsurf).toBeDefined();
		expect(windsurf?.baseDir).toContain("Windsurf");
	});

	it("should include gemini agent", () => {
		const agents = detectAgents();
		const gemini = agents.find((a) => a.agent === "gemini");
		expect(gemini).toBeDefined();
		expect(gemini?.baseDir).toContain(".gemini");
	});

	it("should include aider agent", () => {
		const agents = detectAgents();
		const aider = agents.find((a) => a.agent === "aider");
		expect(aider).toBeDefined();
		expect(aider?.baseDir).toContain(".aider");
	});

	it("should include cline agent", () => {
		const agents = detectAgents();
		const cline = agents.find((a) => a.agent === "cline");
		expect(cline).toBeDefined();
		expect(cline?.baseDir).toContain("saoudrizwan.claude-dev");
	});

	it("should include opencode agent", () => {
		const agents = detectAgents();
		const opencode = agents.find((a) => a.agent === "opencode");
		expect(opencode).toBeDefined();
		expect(opencode?.baseDir).toContain(".opencode");
	});

	it("should include copilot agent", () => {
		const agents = detectAgents();
		const copilot = agents.find((a) => a.agent === "copilot");
		expect(copilot).toBeDefined();
	});

	it("should include antigravity agent", () => {
		const agents = detectAgents();
		const antigravity = agents.find((a) => a.agent === "antigravity");
		expect(antigravity).toBeDefined();
		expect(antigravity?.baseDir).toContain("google.antigravity");
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

	it("should collect sessions from multiple agents", async () => {
		const sessions = await collectAllSessions(["claude-code", "cursor", "codex"]);
		expect(Array.isArray(sessions)).toBe(true);
	});

	it("should collect sessions from new agents", async () => {
		const sessions = await collectAllSessions(["windsurf", "gemini", "aider"]);
		expect(Array.isArray(sessions)).toBe(true);
	});

	it("should return empty array when no agents specified", async () => {
		const sessions = await collectAllSessions([]);
		expect(sessions).toEqual([]);
	});

	it("should handle errors gracefully", async () => {
		const sessions = await collectAllSessions(["claude-code", "cursor", "codex", "windsurf"]);
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

	it("should accept all new agent types", async () => {
		for (const agentType of AGENT_TYPES) {
			const sessions = await collectAllSessions([agentType]);
			expect(Array.isArray(sessions)).toBe(true);
		}
	});
});
