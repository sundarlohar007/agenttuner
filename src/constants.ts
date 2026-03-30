export const APP_NAME = "agenttuner";
export const APP_VERSION = "0.1.0";

// Waste detection thresholds
export const REPEATED_READ_THRESHOLD = 2; // Same file read more than N times
export const REPEATED_COMMAND_THRESHOLD = 2; // Same command run more than N times
export const LARGE_OUTPUT_THRESHOLD = 5000; // Characters considered "large"
export const EXPLORATION_TOOLS_THRESHOLD = 3; // Glob/ls/Grep in one turn

// Config diagnostics
export const MAX_RECOMMENDED_LINES = 100;
export const MAX_CRITICAL_LINES = 150;

// Cost estimation (USD per token, approximate averages)
export const COST_PER_INPUT_TOKEN = 0.000003;
export const COST_PER_OUTPUT_TOKEN = 0.000015;
