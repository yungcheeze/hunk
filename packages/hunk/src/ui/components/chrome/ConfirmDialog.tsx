import type { MouseEvent as TuiMouseEvent } from "@opentui/core";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  confirmDialogHeight,
  MODAL_FRAME_CHROME_ROWS,
  resolveModalGeometry,
} from "../../lib/modalGeometry";
import type { AppTheme } from "../../themes";
import { ModalFrame } from "./ModalFrame";

/** One confirm choice: its footer key legend, label, and the action it runs. */
export interface ConfirmDialogAction {
  /** Keyboard legend shown in the footer, e.g. "enter/s", "d", "esc". */
  keyLabel: string;
  /** Short lowercase verb phrase, e.g. "save" or "never ask". */
  label: string;
  /** Run the choice. Invoked on mouse click; keyboard routing stays with the caller. */
  run: () => void;
}

/** Render the shared mouse-clickable key legend used by modal action footers. */
export function DialogActionRow({
  actions,
  note,
  theme,
}: {
  actions: ConfirmDialogAction[];
  /** Quiet text pinned to the row's right edge, such as who raised the dialog. */
  note?: string;
  theme: AppTheme;
}) {
  const [hoveredActionKey, setHoveredActionKey] = useState<string | null>(null);

  return (
    <box style={{ width: "100%", height: 1, flexDirection: "row" }}>
      {actions.map((action, index) => {
        const hovered = hoveredActionKey === action.keyLabel;
        return (
          <box key={action.keyLabel} style={{ flexDirection: "row" }}>
            {index > 0 ? <text fg={theme.badgeNeutral}> · </text> : null}
            <box
              style={{
                flexDirection: "row",
                paddingLeft: 1,
                paddingRight: 1,
                backgroundColor: hovered ? theme.accentMuted : undefined,
              }}
              onMouseOver={() => setHoveredActionKey(action.keyLabel)}
              onMouseOut={() =>
                setHoveredActionKey((current) => (current === action.keyLabel ? null : current))
              }
              onMouseUp={(event: TuiMouseEvent) => {
                event.stopPropagation();
                action.run();
              }}
            >
              <text fg={theme.accent}>{action.keyLabel}</text>
              <text fg={hovered ? theme.text : theme.muted}> {action.label}</text>
            </box>
          </box>
        );
      })}
      {note ? (
        <>
          <box style={{ flexGrow: 1 }} />
          <text fg={theme.badgeNeutral}>{note}</text>
        </>
      ) : null}
    </box>
  );
}

/**
 * Hunk's standard confirm modal shape: a ModalFrame with arbitrary body rows and
 * one bottom action legend (`key label · key label · …`).
 *
 * Actions are mouse-clickable and highlight on hover. Keyboard shortcuts for the
 * same actions are intentionally not handled here — wire them through
 * useAppKeyboardShortcuts so all key handling stays in one place, and keep each
 * action's `keyLabel` in sync with the keys that hook accepts.
 *
 * New confirmation prompts should reuse this component instead of composing
 * ModalFrame with a hand-rolled footer. Size it with
 * `confirmDialogHeight(bodyRows)` where `bodyRows` counts the 1-row boxes the
 * body renders.
 */
export function ConfirmDialog({
  actions,
  children,
  footerNote,
  height,
  onClose,
  onMouseScroll,
  terminalHeight,
  terminalWidth,
  theme,
  title,
  width,
}: {
  actions: ConfirmDialogAction[];
  children: ReactNode;
  /** Quiet text at the right of the action row. */
  footerNote?: string;
  height: number;
  /** Invoked by the frame's backdrop click and [Esc] affordance. */
  onClose?: () => void;
  /** Wheel input over the dialog, for a body that scrolls. */
  onMouseScroll?: (event: TuiMouseEvent) => void;
  terminalHeight: number;
  terminalWidth: number;
  theme: AppTheme;
  title: string;
  width: number;
}) {
  const frame = resolveModalGeometry({ width, height, terminalWidth, terminalHeight });
  const showActions = frame.height > MODAL_FRAME_CHROME_ROWS;
  const showActionGap = frame.height >= confirmDialogHeight(0);

  return (
    <ModalFrame
      height={height}
      terminalHeight={terminalHeight}
      terminalWidth={terminalWidth}
      theme={theme}
      title={title}
      width={width}
      closeBadge={!showActions}
      onClose={onClose}
      onMouseScroll={onMouseScroll}
    >
      {children}
      {showActionGap ? <box style={{ width: "100%", height: 1 }} /> : null}
      {showActions ? <DialogActionRow actions={actions} note={footerNote} theme={theme} /> : null}
    </ModalFrame>
  );
}
