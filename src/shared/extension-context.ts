import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

/**
 * Declares a tool to the model but keeps it out of codemode scripts and other `ctx.executeTool()`
 * callers. These tools need model-issued calls: nested calls hide their progress, block the script
 * on supervisor replies, and drop `terminate`. Pi 0.99 reads `exposure`; the pinned SDK types
 * predate it and older hosts ignore it.
 */
export const MODEL_ONLY_TOOL = { exposure: "model-only" } as const;

/**
 * Keeps a tool out of the request while leaving it callable from codemode scripts and other
 * `ctx.executeTool()` callers. The parent's delegating tools use it: a session that declares only
 * its own direct tools calls `tools.subagent(...)` from a script. `hidden` tools are not callable.
 */
export const SCRIPT_ONLY_TOOL = { exposure: "deferred" } as const;

/** The `exposure` Pi reports for a registered tool, or undefined on a host that predates it. */
export function toolExposure(pi: { getAllTools?: () => readonly { name: string }[] }, name: string): string | undefined {
	try {
		const tool = pi.getAllTools?.().find((candidate) => candidate.name === name) as { exposure?: string } | undefined;
		return tool?.exposure;
	} catch {
		return undefined;
	}
}

/**
 * Whether naming a tool in `pi.setActiveTools()` declares it to the model. Pi skips only `hidden`
 * tools, so naming a script-only tool would put it back in the request; scripts reach it anyway.
 */
export function declaresToModel(exposure: string | undefined): boolean {
	return exposure !== "deferred" && exposure !== "codemode" && exposure !== "hidden";
}

/** Pi exposes replaced extension contexts as ordinary Errors without a stable code. */
export function isStaleExtensionContextError(error: unknown): boolean {
	return error instanceof Error
		&& /extension ctx is stale|extension context no longer active|stale after session replacement or reload/i.test(error.message);
}

/**
 * Whether the host can render a `ctx.ui.custom()` component. Stock Pi RPC defines `custom` as a
 * no-op stub, so a non-TUI host must declare that it implements the custom-UI contract itself.
 */
export function canRenderComponents(ctx: ExtensionContext): boolean {
	return ctx.mode === "tui" || process.env.PI_SUBAGENTS_COMPONENT_UI === "1";
}

/** Pi throws this from action methods while extensions are still loading, before it binds the runtime. */
export function isUnboundExtensionRuntimeError(error: unknown): boolean {
	return error instanceof Error && /extension runtime not initialized/i.test(error.message);
}

/** Run a synchronous operation against a cached UI context without leaking replacement errors. */
export function withCachedUiContext<T>(
	ctx: ExtensionContext | null | undefined,
	onStale: () => void,
	run: (ctx: ExtensionContext) => T,
): T | undefined {
	if (!ctx) return undefined;
	try {
		if (!ctx.hasUI) return undefined;
		return run(ctx);
	} catch (error) {
		if (!isStaleExtensionContextError(error)) throw error;
		onStale();
		return undefined;
	}
}
