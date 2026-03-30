import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/cli.ts"],
	format: ["cjs", "esm"],
	target: "es2022",
	dts: true,
	clean: true,
	sourcemap: true,
	shims: true,
	splitting: false,
});
