import { describe, expect, test } from "bun:test";
import { runSuspended } from "./runSuspended";

function fakeRenderer() {
  const calls: string[] = [];
  const renderer = {
    isDestroyed: false,
    suspend: () => void calls.push("suspend"),
    resume: () => void calls.push("resume"),
  };
  return { calls, renderer };
}

describe("runSuspended", () => {
  test("suspends, runs the program and resumes, reporting its exit status", async () => {
    const { calls, renderer } = fakeRenderer();
    await expect(runSuspended({ command: ["sh", "-c", "exit 3"], renderer })).resolves.toEqual({
      exitCode: 3,
    });
    expect(calls).toEqual(["suspend", "resume"]);
  });

  test("runs in the given directory", async () => {
    const { renderer } = fakeRenderer();
    const result = await runSuspended({
      command: ["sh", "-c", '[ "$(pwd -P)" = "$(cd /tmp && pwd -P)" ]'],
      cwd: "/tmp",
      renderer,
    });
    expect(result.exitCode).toBe(0);
  });

  test("resumes and rejects when the program cannot start", async () => {
    const { calls, renderer } = fakeRenderer();
    await expect(
      runSuspended({ command: ["hunk-no-such-program-xyz"], renderer }),
    ).rejects.toThrow();
    expect(calls).toEqual(["suspend", "resume"]);
  });

  test("rejects an empty command and a closed terminal without suspending", async () => {
    const { calls, renderer } = fakeRenderer();
    await expect(runSuspended({ command: [], renderer })).rejects.toThrow("No command");
    renderer.isDestroyed = true;
    await expect(runSuspended({ command: ["true"], renderer })).rejects.toThrow("closed");
    expect(calls).toEqual([]);
  });

  test("refuses a second program while one holds the terminal", async () => {
    const { calls, renderer } = fakeRenderer();
    const first = runSuspended({ command: ["sleep", "0.3"], renderer });
    await expect(runSuspended({ command: ["true"], renderer })).rejects.toThrow("already holds");
    await first;
    expect(calls).toEqual(["suspend", "resume"]);
  });
});
