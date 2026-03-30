import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

export async function* readJsonl(filePath: string): AsyncGenerator<Record<string, unknown>> {
	const stream = createReadStream(filePath, { encoding: "utf-8" });
	const rl = createInterface({
		input: stream,
		crlfDelay: Number.POSITIVE_INFINITY,
	});

	for await (const line of rl) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		try {
			yield JSON.parse(trimmed) as Record<string, unknown>;
		} catch {
			// Skip malformed lines
		}
	}
}

export async function readJsonlSync(filePath: string): Promise<Record<string, unknown>[]> {
	const results: Record<string, unknown>[] = [];
	for await (const entry of readJsonl(filePath)) {
		results.push(entry);
	}
	return results;
}
