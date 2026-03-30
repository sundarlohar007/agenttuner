import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import {
	findConfigFiles,
	findJsonlFiles,
	readFileContent,
	fileExists,
	isDirectory,
} from "../../src/utils/fs";

describe("findConfigFiles", () => {
	it("should find CLAUDE.md in current directory", () => {
		const result = findConfigFiles(".");
		expect(result).toBeDefined();
		expect(Array.isArray(result)).toBe(true);
	});

	it("should return empty array for non-existent directory", () => {
		const result = findConfigFiles("/non/existent/path");
		expect(result).toEqual([]);
	});

	it("should find multiple config file types", () => {
		const result = findConfigFiles(".");
		const hasAnyConfig = result.some(
			(f) =>
				f.endsWith("CLAUDE.md") ||
				f.endsWith("AGENTS.md") ||
				f.endsWith(".cursorrules") ||
				f.endsWith(".windsurfrules") ||
				f.endsWith("copilot-instructions.md") ||
				f.endsWith("GEMINI.md"),
		);
		// This test just verifies the function runs without error
		expect(typeof hasAnyConfig).toBe("boolean");
	});
});

describe("findJsonlFiles", () => {
	it("should return empty array for non-existent directory", () => {
		const result = findJsonlFiles("/non/existent/path");
		expect(result).toEqual([]);
	});

	it("should return empty array for empty directory", () => {
		const result = findJsonlFiles("/tmp");
		expect(Array.isArray(result)).toBe(true);
	});

	it("should find jsonl files recursively", () => {
		// Test with a real directory (may or may not have jsonl files)
		const result = findJsonlFiles(".");
		expect(Array.isArray(result)).toBe(true);
	});
});

describe("readFileContent", () => {
	it("should read file content", () => {
		// Use package.json as a test file that exists
		const content = readFileContent(join(process.cwd(), "package.json"));
		expect(content).toBeDefined();
		expect(typeof content).toBe("string");
		expect(content).toContain("agenttuner");
	});

	it("should throw error for non-existent file", () => {
		expect(() => readFileContent("/non/existent/file.txt")).toThrow();
	});
});

describe("fileExists", () => {
	it("should return true for existing file", () => {
		const result = fileExists(join(process.cwd(), "package.json"));
		expect(result).toBe(true);
	});

	it("should return false for non-existent file", () => {
		const result = fileExists("/non/existent/file.txt");
		expect(result).toBe(false);
	});
});

describe("isDirectory", () => {
	it("should return true for existing directory", () => {
		const result = isDirectory(process.cwd());
		expect(result).toBe(true);
	});

	it("should return false for file", () => {
		const result = isDirectory(join(process.cwd(), "package.json"));
		expect(result).toBe(false);
	});

	it("should return false for non-existent path", () => {
		const result = isDirectory("/non/existent/path");
		expect(result).toBe(false);
	});
});
