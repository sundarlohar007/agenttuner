import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	isOllamaRunning,
	listOllamaModels,
	pickBestModel,
	getOllamaStatus,
} from "../../src/optimizer/ollama";

describe("pickBestModel", () => {
	it("should prefer codellama over others", () => {
		const models = ["llama3.1", "codellama:13b", "mistral"];
		const best = pickBestModel(models);
		expect(best).toBe("codellama:13b");
	});

	it("should prefer codegemma if no codellama", () => {
		const models = ["llama3.1", "codegemma:7b", "mistral"];
		const best = pickBestModel(models);
		expect(best).toBe("codegemma:7b");
	});

	it("should prefer llama3.1 over mistral", () => {
		const models = ["mistral", "llama3.1"];
		const best = pickBestModel(models);
		expect(best).toBe("llama3.1");
	});

	it("should return first model if no preferred match", () => {
		const models = ["custom-model", "another-model"];
		const best = pickBestModel(models);
		expect(best).toBe("custom-model");
	});

	it("should return null for empty array", () => {
		const best = pickBestModel([]);
		expect(best).toBeNull();
	});

	it("should match partial model names", () => {
		const models = ["deepseek-coder:6.7b-instruct"];
		const best = pickBestModel(models);
		expect(best).toBe("deepseek-coder:6.7b-instruct");
	});

	it("should prefer codegemma over deepseek-coder", () => {
		const models = ["deepseek-coder", "codegemma"];
		const best = pickBestModel(models);
		expect(best).toBe("codegemma");
	});
});

describe("isOllamaRunning", () => {
	it("should return false when Ollama is not running", async () => {
		const result = await isOllamaRunning("http://localhost:19999");
		expect(result).toBe(false);
	});

	it("should handle timeout gracefully", async () => {
		const result = await isOllamaRunning("http://192.0.2.1:11434");
		expect(result).toBe(false);
	});
});

describe("listOllamaModels", () => {
	it("should return empty array when Ollama is not running", async () => {
		const models = await listOllamaModels("http://localhost:19999");
		expect(models).toEqual([]);
	});
});

describe("getOllamaStatus", () => {
	it("should return not running when Ollama is unavailable", async () => {
		const status = await getOllamaStatus("http://localhost:19999");
		expect(status.running).toBe(false);
		expect(status.models).toEqual([]);
		expect(status.recommendedModel).toBeNull();
	});
});
