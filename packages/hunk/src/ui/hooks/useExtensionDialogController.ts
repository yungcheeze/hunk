import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  type ConfirmDialogBodyLayout,
  planConfirmDialogBody,
} from "../lib/extensionDialogGeometry";
import {
  createExtensionDialogQueue,
  type ExtensionDialogQueue,
  type ExtensionDialogRequest,
} from "../lib/extensionDialogs";

export interface ExtensionDialogController {
  /** Build the dialog capability one extension command receives. */
  createDialogs: ExtensionDialogQueue["createDialogs"];
  /** Request currently visible to the user. */
  request: ExtensionDialogRequest | null;
  selectedIndex: number;
  inputValue: string;
  /** The visible confirm dialog's planned body at its scroll position; null for other kinds. */
  confirmBody: ConfirmDialogBodyLayout | null;
  accept: (selectedIndexOverride?: number) => void;
  cancel: () => void;
  moveSelection: (delta: number) => void;
  pickOption: (index: number) => void;
  /** Scroll a confirm dialog's body by rows or by its visible height, clamped to the rows it has. */
  scrollBody: (delta: number, unit?: "row" | "page") => void;
  updateInput: (value: string) => void;
}

/** Own the React state and lifetime of one App instance's extension-dialog queue. */
export function useExtensionDialogController({
  reviewGeneration,
  terminalHeight,
  terminalWidth,
}: {
  /** Identity token replaced whenever a soft reload swaps the review beneath an open dialog. */
  reviewGeneration: unknown;
  terminalHeight: number;
  terminalWidth: number;
}): ExtensionDialogController {
  const [queue] = useState(createExtensionDialogQueue);
  const request = useSyncExternalStore(queue.subscribe, queue.current, queue.current);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [bodyScroll, setBodyScroll] = useState(0);
  const requestId = request?.id ?? null;
  const initialInput = request?.kind === "input" ? request.initial : "";

  useEffect(() => {
    // A promoted queued request must never inherit the previous request's answer state.
    setSelectedIndex(0);
    setInputValue(initialInput);
    setBodyScroll(0);
  }, [initialInput, requestId]);

  const previousReviewGenerationRef = useRef(reviewGeneration);
  useLayoutEffect(() => {
    if (previousReviewGenerationRef.current !== reviewGeneration) {
      previousReviewGenerationRef.current = reviewGeneration;
      // Child layout effects run before AppHost publishes lifecycle events for
      // the committed generation. Drain only the retired review's requests so
      // a session_reload handler can safely open the replacement's first dialog.
      queue.cancelAll();
    }
  }, [queue, reviewGeneration]);

  useEffect(() => {
    // Settle every pending handler when this App instance leaves the review tree.
    return () => queue.shutdown();
  }, [queue]);

  const planBody = (scroll: number) =>
    request?.kind === "confirm"
      ? planConfirmDialogBody({
          bodyLines: request.bodyLines,
          scroll,
          showAttribution: request.showAttribution,
          terminalHeight,
          terminalWidth,
          title: request.title,
        })
      : null;
  const confirmBody = planBody(bodyScroll);

  /** Scroll from the clamped position on screen, so overshoot never needs unwinding. */
  const scrollBody = (delta: number, unit: "row" | "page" = "row") => {
    if (!confirmBody?.body.truncated) return;

    // The final visible row is the position marker, not body text.
    const rows = unit === "page" ? delta * Math.max(1, confirmBody.body.lines.length - 1) : delta;
    const { maxStart } = confirmBody.body;
    // Keys can arrive faster than renders, so step from the latest stored scroll.
    setBodyScroll((current) => Math.min(Math.max(0, Math.min(current, maxStart) + rows), maxStart));
  };

  /** Answer the visible request with the state appropriate to its dialog kind. */
  const accept = (selectedIndexOverride?: number) => {
    if (!request) return;

    if (request.kind === "select") {
      queue.accept(request.id, request.options[selectedIndexOverride ?? selectedIndex]);
      return;
    }

    queue.accept(request.id, request.kind === "input" ? inputValue : undefined);
  };

  /** Dismiss the visible request with its kind-specific cancel value. */
  const cancel = () => {
    if (request) queue.cancel(request.id);
  };

  /** Move a select request's highlight, wrapping at both ends. */
  const moveSelection = (delta: number) => {
    if (request?.kind !== "select") return;

    const optionCount = request.options.length;
    setSelectedIndex((current) => (current + delta + optionCount) % optionCount);
  };

  return {
    createDialogs: queue.createDialogs,
    request,
    selectedIndex,
    inputValue,
    confirmBody,
    accept,
    cancel,
    moveSelection,
    pickOption: setSelectedIndex,
    scrollBody,
    updateInput: setInputValue,
  };
}
