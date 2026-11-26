import { confirmDialogHeight, resolveModalGeometry } from "./modalGeometry";
import { wrapText } from "./text";

/** Wrapped body rows that fit one modal body allocation, from the first visible row. */
export interface WindowedDialogText {
  lines: string[];
  truncated: boolean;
  /** Index of the first visible wrapped row, after clamping the requested scroll. */
  start: number;
  /** Furthest `start` the body can scroll to; 0 when it fits. */
  maxStart: number;
}

/**
 * Wrap prose to terminal cells and show the rows from `scroll` on.
 *
 * An overflowing body reserves its final row for a position marker naming the
 * visible rows, so the reader sees there is more and how far in they are.
 */
export function windowDialogText(
  sourceLines: readonly string[],
  width: number,
  maxRows: number,
  scroll = 0,
): WindowedDialogText {
  const wrapped = sourceLines.flatMap((line) => wrapText(line, width));
  if (wrapped.length <= maxRows) {
    return { lines: wrapped, truncated: false, start: 0, maxStart: 0 };
  }
  if (maxRows <= 0) {
    return { lines: [], truncated: wrapped.length > 0, start: 0, maxStart: 0 };
  }

  const visibleRows = maxRows - 1;
  const maxStart = wrapped.length - visibleRows;
  const start = Math.min(Math.max(0, scroll), maxStart);
  const marker = `${start + 1}-${start + visibleRows} of ${wrapped.length}`;
  return {
    lines: [...wrapped.slice(start, start + visibleRows), marker],
    truncated: true,
    start,
    maxStart,
  };
}

/** Width every extension dialog is drawn at, clamped to the terminal. */
export function extensionDialogWidth(terminalWidth: number) {
  return Math.min(72, Math.max(40, terminalWidth - 8));
}

/**
 * Width a confirm dialog is drawn at: the shared width, widened to fit its
 * longest body line and its title, up to the terminal's margin.
 *
 * Prose wrapped by its author, such as a commit message at 72 columns, keeps
 * its own line breaks instead of being re-wrapped a few cells short.
 */
function confirmDialogWidth(title: string, bodyLines: readonly string[], terminalWidth: number) {
  // Border and padding take two cells a side; the title row also holds " [Esc]".
  const content = Math.max(title.length + 6, ...bodyLines.map((line) => line.length)) + 4;
  return Math.min(
    Math.max(extensionDialogWidth(terminalWidth), content),
    Math.max(40, terminalWidth - 8),
  );
}

/** Row plan for a confirm dialog's attribution and scrollable body. */
export interface ConfirmDialogBodyLayout {
  frameWidth: number;
  bodyWidth: number;
  attributionRows: number;
  attributionGapRows: number;
  body: WindowedDialogText;
}

/**
 * Plans a confirm dialog's attribution and body rows inside the terminal.
 *
 * The dialog controller clamps scrolling with the same plan the dialog draws,
 * so a key never scrolls past the last row on screen.
 */
export function planConfirmDialogBody({
  bodyLines,
  scroll,
  showAttribution,
  terminalHeight,
  terminalWidth,
  title,
}: {
  bodyLines: readonly string[];
  scroll: number;
  showAttribution: boolean;
  terminalHeight: number;
  terminalWidth: number;
  title: string;
}): ConfirmDialogBodyLayout {
  const frame = resolveModalGeometry({
    width: confirmDialogWidth(title, bodyLines, terminalWidth),
    height: Number.MAX_SAFE_INTEGER,
    terminalWidth,
    terminalHeight,
  });
  const bodyWidth = Math.max(1, frame.width - 4);
  const availableBodyRows = Math.max(0, frame.height - confirmDialogHeight(0));
  const attributionRows = showAttribution && availableBodyRows > 0 ? 1 : 0;
  const rowsAfterAttribution = Math.max(0, availableBodyRows - attributionRows);
  const attributionGapRows =
    attributionRows > 0 && bodyLines.length > 0 && rowsAfterAttribution > 1 ? 1 : 0;
  const bodyRows = Math.max(0, rowsAfterAttribution - attributionGapRows);

  return {
    frameWidth: frame.width,
    bodyWidth,
    attributionRows,
    attributionGapRows,
    body: windowDialogText(bodyLines, bodyWidth, bodyRows, scroll),
  };
}
