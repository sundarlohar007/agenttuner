import { OPTIMIZER_SYSTEM_PROMPT, buildOptimizationPrompt } from "./prompts.js";

interface OllamaModel {
	name: string;
	modified_at: string;
	size: number;
}

interface OllamaTagsResponse {
	models: OllamaModel[];
}

interface OllamaGenerateResponse {
	model: string;
	created_at: string;
	response: string;
	done: boolean;
}

export async function isOllamaRunning(url?: string): Promise<boolean> {
	const ollamaUrl = url ?? process.env["OLLAMA_URL"] ?? "http://localhost:11434";
	try {
		const response = await fetch(`${ollamaUrl}/api/tags`, {
			signal: AbortSignal.timeout(3000),
		});
		return response.ok;
	} catch {
		return false;
	}
}

export async function listOllamaModels(url?: string): Promise<string[]> {
	const ollamaUrl = url ?? process.env["OLLAMA_URL"] ?? "http://localhost:11434";
	try {
		const response = await fetch(`${ollamaUrl}/api/tags`, {
			signal: AbortSignal.timeout(3000),
		});
		if (!response.ok) return [];
		const data = (await response.json()) as OllamaTagsResponse;
		return data.models.map((m) => m.name);
	} catch {
		return [];
	}
}

export function pickBestModel(available: string[]): string | null {
	const preferredOrder = [
		"codellama",
		"codegemma",
		"deepseek-coder",
		"llama3.1",
		"llama3",
		"mistral",
		"gemma2",
		"phi3",
		"qwen2",
	];

	for (const preferred of preferredOrder) {
		const match = available.find(
			(m) => m.startsWith(preferred) || m.includes(preferred),
		);
		if (match) return match;
	}

	return available[0] ?? null;
}

export async function tryOllamaOptimization(
	config: string,
	issuesText: string,
	wasteText: string,
): Promise<string | null> {
	const ollamaUrl = process.env["OLLAMA_URL"] ?? "http://localhost:11434";

	const running = await isOllamaRunning(ollamaUrl);
	if (!running) return null;

	let model = process.env["OLLAMA_MODEL"];
	if (!model) {
		const models = await listOllamaModels(ollamaUrl);
		if (models.length === 0) return null;
		model = pickBestModel(models) ?? undefined;
		if (!model) return null;
	}

	const prompt = buildOptimizationPrompt(config, issuesText, wasteText);

	try {
		const response = await fetch(`${ollamaUrl}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model,
				prompt,
				system: OPTIMIZER_SYSTEM_PROMPT,
				stream: false,
				options: {
					temperature: 0.3,
					num_predict: 2000,
				},
			}),
			signal: AbortSignal.timeout(60000),
		});

		if (!response.ok) return null;

		const data = (await response.json()) as OllamaGenerateResponse;
		const text = data.response?.trim();

		if (!text) return null;

		// Strip markdown code fences if present
		const stripped = text.replace(/^```(?:markdown)?\n?/gm, "").replace(/\n?```$/gm, "").trim();

		return stripped || null;
	} catch {
		return null;
	}
}

export async function getOllamaStatus(url?: string): Promise<{
	running: boolean;
	models: string[];
	recommendedModel: string | null;
}> {
	const ollamaUrl = url ?? process.env["OLLAMA_URL"] ?? "http://localhost:11434";

	const running = await isOllamaRunning(ollamaUrl);
	if (!running) {
		return { running: false, models: [], recommendedModel: null };
	}

	const models = await listOllamaModels(ollamaUrl);
	const recommended = pickBestModel(models);

	return { running: true, models, recommendedModel: recommended };
}
