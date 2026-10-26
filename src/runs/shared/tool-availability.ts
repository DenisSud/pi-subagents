export interface ChildToolDiagnostic {
	agent?: string;
	required: string[];
	available: string[];
	missing: string[];
	missingMcpDirectTools?: string[];
}

/**
 * Explain missing child tools. A name in `tools` that no loaded provider
 * registers is skipped, not fatal: the child runs with the tools it has, and
 * the parent gets one line saying which ones went missing and how to load them.
 * Foreground children never load the parent's ambient extensions, so tools an
 * ambient extension registers (MCP tools, provider tools) only exist for
 * background children; the warning says so instead of reporting a generic gap.
 */
export function formatChildToolWarning(diagnostic: ChildToolDiagnostic, options: { host?: "parent" | "runner" } = {}): string {
	const subject = diagnostic.agent ? `Subagent '${diagnostic.agent}'` : "Subagent";
	const lines = [
		`Tool warning: ${subject} was told to use ${diagnostic.missing.join(", ")}, which no loaded provider registered. The child ran without ${diagnostic.missing.length === 1 ? "it" : "them"}.`,
		"The `tools` field is a strict allowlist; it does not load extension code.",
	];
	if (diagnostic.missingMcpDirectTools?.length) {
		lines.push(`MCP direct tools missing from the child registry: ${diagnostic.missingMcpDirectTools.join(", ")}.`);
	}
	if (options.host === "parent") {
		lines.push("A foreground child never loads the parent's ambient extensions: list the provider in `subagentOnlyExtensions` or `extensions`, or run the child with `async: true` so it loads them.");
	}
	lines.push("For extension tools, add the provider path to `subagentOnlyExtensions`, `extensions`, or as a path-like entry in `tools`, while keeping each registered tool name in `tools`. For MCP tools, check the adapter configuration and the selected names.");
	return lines.join("\n");
}
