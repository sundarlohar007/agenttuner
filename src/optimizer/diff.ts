/**
 * Generate a unified diff between original and optimized content.
 */
export function generateDiff(original: string, optimized: string, filePath = "CLAUDE.md"): string {
	const originalLines = original.split("\n");
	const optimizedLines = optimized.split("\n");

	const diff: string[] = [];
	diff.push(`--- a/${filePath}`);
	diff.push(`+++ b/${filePath}`);

	// Simple line-by-line diff (not a full Myers diff, but sufficient)
	let i = 0;
	let j = 0;

	while (i < originalLines.length || j < optimizedLines.length) {
		if (i >= originalLines.length) {
			// Remaining lines are additions
			diff.push(`+${optimizedLines[j]}`);
			j++;
		} else if (j >= optimizedLines.length) {
			// Remaining lines are deletions
			diff.push(`-${originalLines[i]}`);
			i++;
		} else if (originalLines[i] === optimizedLines[j]) {
			diff.push(` ${originalLines[i]}`);
			i++;
			j++;
		} else {
			// Lines differ — show as remove + add
			diff.push(`-${originalLines[i]}`);
			diff.push(`+${optimizedLines[j]}`);
			i++;
			j++;
		}
	}

	return diff.join("\n");
}

/**
 * Count changes in a diff.
 */
export function countChanges(diff: string): { added: number; removed: number } {
	let added = 0;
	let removed = 0;

	for (const line of diff.split("\n")) {
		if (line.startsWith("+") && !line.startsWith("+++")) added++;
		if (line.startsWith("-") && !line.startsWith("---")) removed++;
	}

	return { added, removed };
}
