import type { CSSProperties } from "react";
import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef
} from "react";
import { EditorHeader } from "./EditorHeader";
import { LineNumbersGutter } from "./LineNumbersGutter";
import { TextAreaRuler } from "./TextAreaRuler";
import { useEditorMetrics } from "./hooks/use-editor-metrics";
import { useSyncScroll } from "./hooks/use-sync-scroll";

export type EditorApi = {
  /** Scroll so that the given 0-based logical line is visible. */
  scrollToLine: (line: number, align?: "top" | "center" | "nearest") => void;
  /** 0-based top visible line index (best effort). */
  getTopVisibleLine: () => number;
  /** Total logical lines (value.split("\n").length). */
  getTotalLines: () => number;
};

type GhostRange = { from: number; to: number }; // inclusive

export const Editor = forwardRef(function Editor(
  {
    label,
    value,
    onChange,
    // header controls
    linkScroll = false,
    onToggleLinkScroll,
    onPrevChange,
    onNextChange,
    // cross-pane coordination
    ghostRanges = [],
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;

    linkScroll?: boolean;
    onToggleLinkScroll?: () => void;
    onPrevChange?: () => void;
    onNextChange?: () => void;

    onScrollLines?: (info: {
      topLine: number;
      scrollTop: number;
      clientHeight: number;
      totalLines: number;
    }) => void;
    ghostRanges?: GhostRange[];
  },
  ref
) {
  // ---- Refs
  const taRef = useRef<HTMLTextAreaElement>(null);
  const gutRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);

  // ---- Derived content
  const logicalLines = useMemo(() => value.split("\n"), [value]);

  // ---- Measurements + offsets (stateful hook)
  const { gutterHeights, rowPx, offsets } = useEditorMetrics({
    value,
    taRef,
    rulerRef,
  });

  // ---- Scroll sync (textarea ↔ gutter ↔ ruler ↔ ghost overlay)
  useSyncScroll({ taRef, gutRef, rulerRef, ghostRef });

  // ---- Helpers
  const clampLine = (i: number) =>
    Math.max(0, Math.min(logicalLines.length - 1, i));

  const getTopVisibleLine = (): number => {
    const ta = taRef.current;
    if (!ta || offsets.length === 0) return 0;
    const y = ta.scrollTop;

    // binary search in offsets
    let lo = 0,
      hi = offsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (offsets[mid] <= y) lo = mid + 1;
      else hi = mid;
    }
    return clampLine(lo - 1);
  };

  const scrollToLine = (
    line: number,
    align: "top" | "center" | "nearest" = "top"
  ) => {
    const ta = taRef.current;
    if (!ta) return;
    const l = clampLine(line);
    const top = offsets[l] ?? 0;

    let target = top;
    if (align === "center") {
      target = Math.max(0, top - Math.round((ta.clientHeight - rowPx) / 2));
    } else if (align === "nearest") {
      const curr = ta.scrollTop;
      const deltaTop = Math.abs(curr - top);
      const centerTop = Math.max(
        0,
        top - Math.round((ta.clientHeight - rowPx) / 2)
      );
      const deltaCenter = Math.abs(curr - centerTop);
      target = deltaCenter < deltaTop ? centerTop : top;
    }

    ta.scrollTop = target;
  };

  // ---- Expose public API
  useImperativeHandle(
    ref,
    (): EditorApi => ({
      scrollToLine,
      getTopVisibleLine,
      getTotalLines: () => logicalLines.length,
    }),
    [scrollToLine, getTopVisibleLine, logicalLines.length]
  );

  // ---- Render
  return (
    <div className="editor mono">
      <EditorHeader
        label={label}
        linkScroll={linkScroll}
        onToggleLinkScroll={onToggleLinkScroll}
        onPrevChange={onPrevChange}
        onNextChange={onNextChange}
      />

      <div className="editor-body">
        <LineNumbersGutter
          ref={gutRef}
          lineCount={logicalLines.length}
          gutterHeights={gutterHeights}
          rowVarStyle={{ height: "var(--editor-row)" } as CSSProperties}
        />

        <TextAreaRuler
          taRef={taRef}
          rulerRef={rulerRef}
          ghostRef={ghostRef}
          value={value}
          onChange={onChange}
          logicalLines={logicalLines}
          ghostRanges={ghostRanges}
          offsets={offsets}
          clampLine={clampLine}
        />
      </div>
    </div>
  );
});
