export interface ConfigIssue {
	ruleId: string;
	severity: "error" | "warning" | "info";
	message: string;
	section?: string;
	line?: number;
	suggestion: string;
}

export interface ParsedSection {
	name: string;
	startLine: number;
	endLine: number;
	content: string;
	lineCount: number;
	hasCommands: boolean;
}

export interface DiagnosticResult {
	filePath: string;
	score: number;
	issues: ConfigIssue[];
	sections: ParsedSection[];
	missingSections: string[];
	lineCount: number;
	optimizedContent?: string;
}
