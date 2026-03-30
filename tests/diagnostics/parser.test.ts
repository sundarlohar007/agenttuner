import { describe, it, expect } from "vitest";
import {
	parseConfigSections,
	extractCommands,
} from "../../src/diagnostics/parser";

describe("parseConfigSections", () => {
	it("should parse markdown headers into sections", () => {
		const content = `## Section 1
Some content here
## Section 2
More content`;
		const sections = parseConfigSections(content);
		expect(sections.length).toBe(2);
		expect(sections[0]?.name).toBe("Section 1");
		expect(sections[1]?.name).toBe("Section 2");
	});

	it("should handle empty content", () => {
		const sections = parseConfigSections("");
		expect(sections).toEqual([]);
	});

	it("should handle content with no headers", () => {
		const content = "Just some plain text\nwith no headers";
		const sections = parseConfigSections(content);
		expect(sections).toEqual([]);
	});

	it("should detect commands in sections", () => {
		const content = `## Commands
Run \`npm test\` to test
Run \`npm build\` to build`;
		const sections = parseConfigSections(content);
		expect(sections.length).toBe(1);
		expect(sections[0]?.hasCommands).toBe(true);
	});

	it("should handle h1, h2, and h3 headers", () => {
		const content = `# H1 Header
## H2 Header
### H3 Header
Content`;
		const sections = parseConfigSections(content);
		expect(sections.length).toBe(3);
		expect(sections[0]?.name).toBe("H1 Header");
		expect(sections[1]?.name).toBe("H2 Header");
		expect(sections[2]?.name).toBe("H3 Header");
	});

	it("should calculate line counts correctly", () => {
		const content = `## Section
Line 1
Line 2
Line 3`;
		const sections = parseConfigSections(content);
		expect(sections[0]?.lineCount).toBe(4); // Header + 3 lines
	});

	it("should handle sections with no content after header", () => {
		const content = `## Section 1
## Section 2`;
		const sections = parseConfigSections(content);
		expect(sections.length).toBe(2);
		expect(sections[0]?.lineCount).toBe(1); // Just the header
	});
});

describe("extractCommands", () => {
	it("should extract commands from backtick-wrapped text", () => {
		const content = "Run `npm test` and `npm run build`";
		const commands = extractCommands(content);
		expect(commands).toContain("npm test");
		expect(commands).toContain("npm run build");
	});

	it("should extract package manager commands", () => {
		const content = "Use `pnpm install` or `yarn add`";
		const commands = extractCommands(content);
		expect(commands).toContain("pnpm install");
		expect(commands).toContain("yarn add");
	});

	it("should ignore non-command backticks", () => {
		const content = "Use `variable` and `code` but `npm test` is a command";
		const commands = extractCommands(content);
		expect(commands).toContain("npm test");
		expect(commands).not.toContain("variable");
		expect(commands).not.toContain("code");
	});

	it("should extract commands with multiple spaces", () => {
		const content = "Run `npm run test:unit -- --coverage`";
		const commands = extractCommands(content);
		expect(commands).toContain("npm run test:unit -- --coverage");
	});

	it("should return empty array for content with no commands", () => {
		const content = "Just some text with no commands";
		const commands = extractCommands(content);
		expect(commands).toEqual([]);
	});

	it("should extract cargo, pip, go, dotnet commands", () => {
		const content = "Run `cargo test`, `pip install`, `go build`, `dotnet build`";
		const commands = extractCommands(content);
		expect(commands).toContain("cargo test");
		expect(commands).toContain("pip install");
		expect(commands).toContain("go build");
		expect(commands).toContain("dotnet build");
	});
});
