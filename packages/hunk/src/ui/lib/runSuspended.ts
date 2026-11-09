import { setImmediate as yieldToEventLoop } from "node:timers/promises";
import type { CliRenderer } from "@opentui/core";

type SuspendableRenderer = Pick<CliRenderer, "suspend" | "resume" | "isDestroyed">;

const holders = new WeakSet<SuspendableRenderer>();

/** Give the terminal to a program, then redraw: the suspend/resume open-in-editor uses. */
export async function runSuspended({
  command,
  cwd,
  renderer,
}: {
  command: readonly string[];
  cwd?: string;
  renderer: SuspendableRenderer;
}): Promise<{ exitCode: number }> {
  if (command.length === 0) throw new Error("No command to run.");
  if (renderer.isDestroyed) throw new Error("The terminal session has closed.");
  if (holders.has(renderer)) throw new Error("A program already holds the terminal.");
  holders.add(renderer);
  try {
    renderer.suspend();
    // Bun releases its stdin reader on the tick after pause(); finish that handoff before
    // blocking in spawnSync so the child gets the input.
    await yieldToEventLoop();
    if (renderer.isDestroyed) throw new Error("The terminal session has closed.");
    const result = Bun.spawnSync([...command], {
      cwd,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    return { exitCode: result.exitCode };
  } finally {
    holders.delete(renderer);
    if (!renderer.isDestroyed) renderer.resume();
  }
}
