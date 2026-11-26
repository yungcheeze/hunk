import { describe, expect, test } from "bun:test";
import { planConfirmDialogBody, windowDialogText } from "./extensionDialogGeometry";

describe("windowDialogText", () => {
  test("wraps prose within the available terminal-cell rows", () => {
    expect(windowDialogText(["one two three"], 7, 3)).toEqual({
      lines: ["one two", "three"],
      truncated: false,
      start: 0,
      maxStart: 0,
    });
  });

  test("pins a position marker to the final allocated row", () => {
    expect(windowDialogText(["one", "two", "three", "four"], 7, 3)).toEqual({
      lines: ["one", "two", "1-2 of 4"],
      truncated: true,
      start: 0,
      maxStart: 2,
    });
    expect(windowDialogText(["overflow"], 3, 0)).toEqual({
      lines: [],
      truncated: true,
      start: 0,
      maxStart: 0,
    });
  });

  test("shows the rows from the scroll position, clamped to the last full window", () => {
    const lines = ["one", "two", "three", "four", "five"];

    expect(windowDialogText(lines, 7, 3, 1).lines).toEqual(["two", "three", "2-3 of 5"]);
    expect(windowDialogText(lines, 7, 3, 99)).toMatchObject({
      lines: ["four", "five", "4-5 of 5"],
      start: 3,
    });
    expect(windowDialogText(lines, 7, 3, -4).start).toBe(0);
  });
});

describe("planConfirmDialogBody", () => {
  test("lets a body taller than the terminal scroll to its last line", () => {
    const bodyLines = Array.from({ length: 40 }, (_, index) => `line ${index + 1}`);
    const layout = planConfirmDialogBody({
      bodyLines,
      scroll: 1000,
      subtitle: "",
      terminalHeight: 20,
      terminalWidth: 80,
      title: "Commit",
    });

    expect(layout.body.truncated).toBe(true);
    expect(layout.body.start).toBe(layout.body.maxStart);
    expect(layout.body.lines.at(-2)).toBe("line 40");
  });

  test("widens to fit 72-column prose, up to the terminal's margin", () => {
    const line = "x".repeat(72);
    const plan = (terminalWidth: number) =>
      planConfirmDialogBody({
        bodyLines: [line],
        scroll: 0,
        subtitle: "",
        terminalHeight: 30,
        terminalWidth,
        title: "Commit",
      });

    expect(plan(160).bodyWidth).toBe(72);
    expect(plan(160).body.lines).toEqual([line]);
    expect(plan(70).frameWidth).toBe(62);
  });
});
