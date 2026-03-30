import { platform } from "node:os";

export const isWindows = platform() === "win32";
export const isMac = platform() === "darwin";
export const isLinux = platform() === "linux";

export function normalizePath(path: string): string {
	return path.replace(/\\/g, "/");
}
