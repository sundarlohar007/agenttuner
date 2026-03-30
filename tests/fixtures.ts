import type { UnifiedSession, UnifiedMessage } from "../src/collectors/types";
import type { WastePattern } from "../src/analyzers/types";

export function createMockSession(overrides: Partial<UnifiedSession> = {}): UnifiedSession {
	return {
		agent: "claude-code",
		sessionId: "test-session-1",
		projectPath: "/test/project",
		startTime: "2024-01-01T00:00:00Z",
		endTime: "2024-01-01T01:00:00Z",
		messages: [],
		totalInputTokens: 1000,
		totalOutputTokens: 500,
		...overrides,
	};
}

export function createMockMessage(overrides: Partial<UnifiedMessage> = {}): UnifiedMessage {
	return {
		role: "assistant",
		content: "Test message",
		timestamp: "2024-01-01T00:00:00Z",
		...overrides,
	};
}

export function createMockWastePattern(overrides: Partial<WastePattern> = {}): WastePattern {
	return {
		type: "repeated-read",
		severity: "medium",
		description: "Test waste pattern",
		occurrences: 2,
		estimatedWastedTokens: 1000,
		locations: [{ turn: 0, detail: "Test location" }],
		fixSuggestion: "Test fix suggestion",
		...overrides,
	};
}

export const SAMPLE_CLAUDE_MD = `# Test Project

## Architecture
This is a test project using TypeScript and Node.js.

## Commands
- Install: \`npm install\`
- Test: \`npm test\`
- Build: \`npm run build\`
- Lint: \`npm run lint\`

## Conventions
- Use TypeScript strict mode
- Prefer named exports
- Use async/await over callbacks

## Constraints
- Never modify node_modules
- Never commit .env files
- Always run tests before committing

## Verification
- Run \`npm test\` to verify changes
- Run \`npm run lint\` to check code style
- Run \`npm run typecheck\` to verify types

## Common Pitfalls
- Don't forget to import types when using TypeScript
- Always check for null values before accessing properties
`;

export const VAGUE_CLAUDE_MD = `# Test Project

Always write clean code. Ensure proper error handling. Follow best practices.
Be careful with async operations. Make sure to handle all edge cases.

This is a very long line that exceeds the recommended length and contains no specific actionable instructions that would help an agent understand what to do exactly in this situation.
`;

export const LONG_CLAUDE_MD = `# Test Project

## Section 1
${Array(50).fill("Some content line").join("\n")}

## Section 2
${Array(50).fill("More content line").join("\n")}

## Section 3
${Array(60).fill("Even more content line").join("\n")}
`;
