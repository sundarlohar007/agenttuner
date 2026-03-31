import Database from "better-sqlite3";
import type { Trajectory, Iteration } from "./types.js";

export class TrajectoryStore {
	private db: Database.Database;

	constructor(dbPath: string) {
		this.db = new Database(dbPath);
		this.db.pragma("journal_mode = WAL");
		this.initSchema();
	}

	private initSchema(): void {
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS trajectories (
				id TEXT PRIMARY KEY,
				session_id TEXT,
				config_hash TEXT,
				steps TEXT,
				outcome TEXT,
				score REAL,
				tokens_used INTEGER,
				timestamp INTEGER
			);

			CREATE TABLE IF NOT EXISTS iterations (
				id TEXT PRIMARY KEY,
				iteration INTEGER,
				config_hash TEXT,
				config_content TEXT,
				avg_score REAL,
				success_rate REAL,
				tokens_used INTEGER,
				mutations TEXT,
				timestamp INTEGER
			);
		`);
	}

	saveTrajectory(t: Trajectory): void {
		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO trajectories (id, session_id, config_hash, steps, outcome, score, tokens_used, timestamp)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`);
		stmt.run(
			t.id,
			t.sessionId,
			t.configHash,
			JSON.stringify(t.steps),
			t.outcome,
			t.score,
			t.tokensUsed,
			t.timestamp,
		);
	}

	getTrajectories(filter?: { configHash?: string; minScore?: number }): Trajectory[] {
		let query = "SELECT * FROM trajectories WHERE 1=1";
		const params: unknown[] = [];

		if (filter?.configHash) {
			query += " AND config_hash = ?";
			params.push(filter.configHash);
		}

		if (filter?.minScore !== undefined) {
			query += " AND score >= ?";
			params.push(filter.minScore);
		}

		query += " ORDER BY timestamp DESC";

		const rows = this.db.prepare(query).all(...params) as Array<{
			id: string;
			session_id: string;
			config_hash: string;
			steps: string;
			outcome: string;
			score: number;
			tokens_used: number;
			timestamp: number;
		}>;

		return rows.map((row) => ({
			id: row.id,
			sessionId: row.session_id,
			configHash: row.config_hash,
			steps: JSON.parse(row.steps),
			outcome: row.outcome as Trajectory["outcome"],
			score: row.score,
			tokensUsed: row.tokens_used,
			timestamp: row.timestamp,
		}));
	}

	saveIteration(iter: Iteration): void {
		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO iterations (id, iteration, config_hash, config_content, avg_score, success_rate, tokens_used, mutations, timestamp)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);
		stmt.run(
			iter.id,
			iter.iteration,
			iter.configHash,
			iter.configContent,
			iter.avgScore,
			iter.successRate,
			iter.tokensUsed,
			JSON.stringify(iter.mutations),
			iter.timestamp,
		);
	}

	getIterations(): Iteration[] {
		const rows = this.db
			.prepare("SELECT * FROM iterations ORDER BY iteration ASC")
			.all() as Array<{
			id: string;
			iteration: number;
			config_hash: string;
			config_content: string;
			avg_score: number;
			success_rate: number;
			tokens_used: number;
			mutations: string;
			timestamp: number;
		}>;

		return rows.map((row) => ({
			id: row.id,
			iteration: row.iteration,
			configHash: row.config_hash,
			configContent: row.config_content,
			avgScore: row.avg_score,
			successRate: row.success_rate,
			tokensUsed: row.tokens_used,
			mutations: JSON.parse(row.mutations),
			timestamp: row.timestamp,
		}));
	}

	getBestIteration(): Iteration | null {
		const row = this.db
			.prepare("SELECT * FROM iterations ORDER BY avg_score DESC LIMIT 1")
			.get() as
			| {
					id: string;
					iteration: number;
					config_hash: string;
					config_content: string;
					avg_score: number;
					success_rate: number;
					tokens_used: number;
					mutations: string;
					timestamp: number;
			  }
			| undefined;

		if (!row) return null;

		return {
			id: row.id,
			iteration: row.iteration,
			configHash: row.config_hash,
			configContent: row.config_content,
			avgScore: row.avg_score,
			successRate: row.success_rate,
			tokensUsed: row.tokens_used,
			mutations: JSON.parse(row.mutations),
			timestamp: row.timestamp,
		};
	}

	close(): void {
		this.db.close();
	}
}
