import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Command } from "commander";
import { createSpinner } from "nanospinner";
import pc from "picocolors";
import { analyzeAllSessions } from "./analyzers/index.js";
import { collectAllSessions, detectAgents } from "./collectors/index.js";
import { diagnoseConfig } from "./diagnostics/index.js";
import { optimizeConfig } from "./optimizer/index.js";
import { generateHtmlReport } from "./report/html.js";
import { printDiagnosticReport, printDiff, printScanReport } from "./report/index.js";
import { generateMarkdownReport } from "./report/markdown.js";
import { findConfigFiles } from "./utils/fs.js";

const VERSION = "0.1.0";

const program = new Command();

program
	.name("agenttuner")
	.description(
		"Your CLAUDE.md is wasting tokens. Auto-optimize your AI coding agent configs from real session data.",
	)
	.version(VERSION);

// ── scan ──────────────────────────────────────────────────────────
program
	.command("scan")
	.description("Analyze past agent sessions and show waste report")
	.argument("[path]", "Project path to scan", ".")
	.option(
		"-a, --agents <agents>",
		"Comma-separated agents to scan (claude-code,cursor,codex)",
		"claude-code,cursor,codex",
	)
	.option("-o, --output <format>", "Output format (terminal, html, markdown)", "terminal")
	.option("--output-file <path>", "Output file path (for html/markdown)")
	.action(
		async (path: string, options: { agents: string; output: string; outputFile?: string }) => {
			const spinner = createSpinner("Scanning agent sessions...").start();

			try {
				const agents = options.agents.split(",").map((a) => a.trim()) as Array<
					"claude-code" | "cursor" | "codex"
				>;

				// Detect available agents
				const available = detectAgents();
				const availableAgents = available.filter((a) => a.exists).map((a) => a.agent);
				const targetAgents = agents.filter((a) => availableAgents.includes(a));

				if (targetAgents.length === 0) {
					spinner.error({ text: "No supported agent sessions found." });
					console.log("");
					console.log(pc.dim("Detected agents:"));
					for (const agent of available) {
						const status = agent.exists ? pc.green("found") : pc.red("not found");
						console.log(`  ${agent.agent}: ${status} (${agent.baseDir})`);
					}
					return;
				}

				spinner.update({ text: `Collecting sessions from: ${targetAgents.join(", ")}...` });
				const sessions = await collectAllSessions(targetAgents);

				if (sessions.length === 0) {
					spinner.warn({ text: "No sessions found." });
					return;
				}

				spinner.update({ text: `Analyzing ${sessions.length} sessions...` });
				const result = analyzeAllSessions(sessions);
				spinner.success({ text: `Analyzed ${sessions.length} sessions.` });

				if (options.output === "html") {
					const html = generateHtmlReport(result, null);
					const outFile = options.outputFile || "agenttuner-report.html";
					writeFileSync(outFile, html);
					console.log(pc.green(`\nReport saved to ${outFile}`));
				} else if (options.output === "markdown") {
					const md = generateMarkdownReport(result, null);
					const outFile = options.outputFile || "agenttuner-report.md";
					writeFileSync(outFile, md);
					console.log(pc.green(`\nReport saved to ${outFile}`));
				} else {
					printScanReport(result);
				}
			} catch (error) {
				spinner.error({
					text: `Scan failed: ${error instanceof Error ? error.message : String(error)}`,
				});
			}
		},
	);

// ── diagnose ──────────────────────────────────────────────────────
program
	.command("diagnose")
	.description("Score your agent config and show issues")
	.argument("[path]", "Project path", ".")
	.action(async (path: string) => {
		const spinner = createSpinner("Finding config files...").start();
		const projectPath = resolve(path);

		try {
			const configFiles = findConfigFiles(projectPath);

			if (configFiles.length === 0) {
				spinner.error({ text: "No config files found (CLAUDE.md, AGENTS.md, etc.)" });
				return;
			}

			spinner.success({ text: `Found ${configFiles.length} config file(s).` });

			for (const file of configFiles) {
				const result = diagnoseConfig(file);
				printDiagnosticReport(result);
			}
		} catch (error) {
			spinner.error({
				text: `Diagnose failed: ${error instanceof Error ? error.message : String(error)}`,
			});
		}
	});

// ── fix ───────────────────────────────────────────────────────────
program
	.command("fix")
	.description("Auto-optimize your agent config")
	.argument("[path]", "Project path", ".")
	.option("--dry-run", "Show changes without applying", false)
	.option("--no-backup", "Skip creating backup of original file")
	.action(async (path: string, options: { dryRun: boolean; backup: boolean }) => {
		const spinner = createSpinner("Analyzing...").start();
		const projectPath = resolve(path);

		try {
			// 1. Find config files
			const configFiles = findConfigFiles(projectPath);
			if (configFiles.length === 0) {
				spinner.error({ text: "No config files found." });
				return;
			}

			// 2. Collect sessions
			spinner.update({ text: "Collecting agent sessions..." });
			const sessions = await collectAllSessions();
			const analysis = sessions.length > 0 ? analyzeAllSessions(sessions) : null;

			// 3. Diagnose and fix each config file
			for (const configFile of configFiles) {
				spinner.update({ text: `Optimizing ${configFile}...` });
				const diagnostic = diagnoseConfig(configFile);
				const wastePatterns = analysis?.sessions.flatMap((s) => s.wastePatterns) ?? [];

				const result = await optimizeConfig(configFile, diagnostic.issues, wastePatterns);

				spinner.stop();

				if (result.changes.added === 0 && result.changes.removed === 0) {
					console.log(pc.yellow("\nNo changes needed — your config is already well-optimized!"));
					continue;
				}

				printDiff(result.diff);

				if (!options.dryRun) {
					// Backup original
					if (options.backup) {
						const backupPath = `${configFile}.bak`;
						writeFileSync(backupPath, result.original);
						console.log(pc.dim(`Backup saved to ${backupPath}`));
					}

					// Write optimized version
					writeFileSync(configFile, result.optimized);
					console.log(
						pc.green(
							`\nOptimized ${configFile} (+${result.changes.added}/-${result.changes.removed} lines)`,
						),
					);
				} else {
					console.log(pc.dim(`\nDry run — no changes applied. Run without --dry-run to apply.`));
				}
			}
		} catch (error) {
			spinner.error({
				text: `Fix failed: ${error instanceof Error ? error.message : String(error)}`,
			});
		}
	});

// ── diff ──────────────────────────────────────────────────────────
program
	.command("diff")
	.description("Show what the optimizer would change")
	.argument("[path]", "Project path", ".")
	.action(async (path: string) => {
		const spinner = createSpinner("Analyzing...").start();
		const projectPath = resolve(path);

		try {
			const configFiles = findConfigFiles(projectPath);
			if (configFiles.length === 0) {
				spinner.error({ text: "No config files found." });
				return;
			}

			spinner.update({ text: "Collecting sessions..." });
			const sessions = await collectAllSessions();
			const analysis = sessions.length > 0 ? analyzeAllSessions(sessions) : null;

			for (const configFile of configFiles) {
				spinner.update({ text: `Analyzing ${configFile}...` });
				const diagnostic = diagnoseConfig(configFile);
				const wastePatterns = analysis?.sessions.flatMap((s) => s.wastePatterns) ?? [];

				const result = await optimizeConfig(configFile, diagnostic.issues, wastePatterns);
				spinner.stop();

				printDiff(result.diff);
				console.log(
					pc.dim(`${result.changes.added} additions, ${result.changes.removed} removals`),
				);
			}
		} catch (error) {
			spinner.error({
				text: `Diff failed: ${error instanceof Error ? error.message : String(error)}`,
			});
		}
	});

// ── report ────────────────────────────────────────────────────────
program
	.command("report")
	.description("Generate a full HTML or Markdown report")
	.argument("[path]", "Project path", ".")
	.option("-f, --format <format>", "Report format (html, markdown)", "html")
	.option("-o, --output <path>", "Output file path")
	.action(async (path: string, options: { format: string; output?: string }) => {
		const spinner = createSpinner("Generating report...").start();
		const projectPath = resolve(path);

		try {
			// Collect sessions
			const sessions = await collectAllSessions();
			const analysis = sessions.length > 0 ? analyzeAllSessions(sessions) : null;

			// Diagnose configs
			const configFiles = findConfigFiles(projectPath);
			const diagnostic = configFiles.length > 0 ? diagnoseConfig(configFiles[0]!) : null;

			spinner.stop();

			if (options.format === "html") {
				const html = generateHtmlReport(analysis, diagnostic);
				const outFile = options.output || "agenttuner-report.html";
				writeFileSync(outFile, html);
				console.log(pc.green(`\nHTML report saved to ${outFile}`));
			} else {
				const md = generateMarkdownReport(analysis, diagnostic);
				const outFile = options.output || "agenttuner-report.md";
				writeFileSync(outFile, md);
				console.log(pc.green(`\nMarkdown report saved to ${outFile}`));
			}
		} catch (error) {
			spinner.error({
				text: `Report failed: ${error instanceof Error ? error.message : String(error)}`,
			});
		}
	});

// ── agents ────────────────────────────────────────────────────────
program
	.command("agents")
	.description("Show detected coding agents and their session paths")
	.action(() => {
		console.log("");
		console.log(pc.bold("Detected Coding Agents:"));
		console.log("");

		const agents = detectAgents();
		for (const agent of agents) {
			const status = agent.exists ? pc.green("✓ found") : pc.red("✗ not found");
			console.log(`  ${status}  ${pc.bold(agent.agent)}`);
			console.log(`          ${pc.dim(agent.baseDir)}`);
		}
		console.log("");
	});

program.parse();
