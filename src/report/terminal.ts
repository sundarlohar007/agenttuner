import pc from "picocolors";
import type { FullAnalysisResult } from "../analyzers/types.js";
import { getScoreLabel } from "../diagnostics/scorer.js";
import type { DiagnosticResult } from "../diagnostics/types.js";

export function printScanReport(result: FullAnalysisResult): void {
	console.log("");
	console.log(pc.bold(pc.cyan("═══════════════════════════════════════════════════")));
	console.log(pc.bold(pc.cyan("  AgentTuner — Session Analysis Report")));
	console.log(pc.bold(pc.cyan("═══════════════════════════════════════════════════")));
	console.log("");

	// Summary
	console.log(pc.bold("📊 Summary"));
	console.log(`   Sessions analyzed:  ${pc.white(String(result.totalSessions))}`);
	console.log(`   Total tokens used:  ${pc.white(formatNumber(result.totalTokensUsed))}`);
	console.log(
		`   Estimated waste:    ${pc.yellow(formatNumber(result.estimatedWastedTokens))} tokens`,
	);
	console.log(
		`   Estimated cost:     ${pc.yellow(`$${result.estimatedWastedCost.toFixed(2)}`)} wasted`,
	);
	console.log("");

	// Waste categories
	if (result.topWasteCategories.length > 0) {
		console.log(pc.bold("🔴 Top Waste Categories"));
		for (const cat of result.topWasteCategories) {
			const bar = "█".repeat(Math.min(20, Math.round(cat.tokens / 1000)));
			console.log(
				`   ${pc.red(bar)} ${formatWasteType(cat.type)} — ${formatNumber(cat.tokens)} tokens (${cat.count}x)`,
			);
		}
		console.log("");
	}

	// Per-session details
	if (result.sessions.length > 0) {
		console.log(pc.bold("📋 Per-Session Breakdown"));
		for (const session of result.sessions.slice(0, 10)) {
			const wastePercent =
				session.totalTokens > 0
					? Math.round((session.estimatedWastedTokens / session.totalTokens) * 100)
					: 0;
			const agentLabel = pc.cyan(`[${session.agent}]`);
			const wasteColor = wastePercent > 20 ? pc.red : wastePercent > 10 ? pc.yellow : pc.green;
			console.log(
				`   ${agentLabel} ${session.totalTurns} turns, ${formatNumber(session.totalTokens)} tokens, ${wasteColor(`${wastePercent}% waste`)}`,
			);
			for (const pattern of session.wastePatterns.slice(0, 3)) {
				console.log(
					`         ${pc.dim("└─")} ${formatWasteType(pattern.type)}: ${pattern.description}`,
				);
			}
		}
		if (result.sessions.length > 10) {
			console.log(`   ... and ${result.sessions.length - 10} more sessions`);
		}
	}

	console.log("");
}

export function printDiagnosticReport(result: DiagnosticResult): void {
	console.log("");
	console.log(pc.bold(pc.cyan("═══════════════════════════════════════════════════")));
	console.log(pc.bold(pc.cyan("  AgentTuner — Config Diagnostic Report")));
	console.log(pc.bold(pc.cyan("═══════════════════════════════════════════════════")));
	console.log("");

	// Score
	const scoreLabel = getScoreLabel(result.score);
	const scoreColor = result.score >= 75 ? pc.green : result.score >= 50 ? pc.yellow : pc.red;
	console.log(pc.bold(`🎯 Config Score: ${scoreColor(`${result.score}/100`)} (${scoreLabel})`));
	console.log(`   File: ${result.filePath} (${result.lineCount} lines)`);
	console.log("");

	// Issues
	if (result.issues.length > 0) {
		console.log(pc.bold(`⚠️  Issues Found (${result.issues.length})`));
		for (const issue of result.issues) {
			const icon =
				issue.severity === "error"
					? pc.red("✗")
					: issue.severity === "warning"
						? pc.yellow("⚠")
						: pc.blue("ℹ");
			console.log(`   ${icon} ${issue.message}`);
			console.log(`     ${pc.dim("→")} ${issue.suggestion}`);
		}
		console.log("");
	}

	// Missing sections
	if (result.missingSections.length > 0) {
		console.log(pc.bold("📝 Missing Recommended Sections"));
		for (const section of result.missingSections) {
			console.log(`   ${pc.yellow("-")} ${section}`);
		}
		console.log("");
	}

	// Sections overview
	if (result.sections.length > 0) {
		console.log(pc.bold("📑 Current Sections"));
		for (const section of result.sections) {
			const cmdTag = section.hasCommands ? pc.green(" [has commands]") : pc.dim(" [no commands]");
			console.log(`   ${section.name} (${section.lineCount} lines)${cmdTag}`);
		}
		console.log("");
	}
}

export function printDiff(diff: string): void {
	console.log("");
	console.log(pc.bold(pc.cyan("═══════════════════════════════════════════════════")));
	console.log(pc.bold(pc.cyan("  AgentTuner — Optimization Diff")));
	console.log(pc.bold(pc.cyan("═══════════════════════════════════════════════════")));
	console.log("");

	for (const line of diff.split("\n")) {
		if (line.startsWith("+++") || line.startsWith("---")) {
			console.log(pc.bold(line));
		} else if (line.startsWith("+")) {
			console.log(pc.green(line));
		} else if (line.startsWith("-")) {
			console.log(pc.red(line));
		} else {
			console.log(pc.dim(line));
		}
	}

	console.log("");
}

function formatNumber(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return String(n);
}

function formatWasteType(type: string): string {
	const labels: Record<string, string> = {
		"repeated-read": "Repeated File Reads",
		"repeated-command": "Repeated Commands",
		"exploration-loop": "Exploration Loops",
		"file-churn": "File Churn",
		"idle-turn": "Idle Turns",
		"empty-tool-result": "Empty Tool Results",
		"large-output-ignored": "Ignored Large Outputs",
	};
	return labels[type] ?? type;
}
