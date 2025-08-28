import {
  useEffect,
  useRef,
  useMemo,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";

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
    onScrollLines, // reports top line while scrolling
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
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const gutRef = useRef<HTMLDivElement | null>(null);
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  const [gutterHeights, setGutterHeights] = useState<number[]>([]);
  const logicalLines = useMemo(() => value.split("\n"), [value]);

  // ------- Keep gutter + ruler in sync with textarea scrolling
  useEffect(() => {
    const ta = taRef.current, g = gutRef.current, r = rulerRef.current, gh = ghostRef.current;
    if (!ta || !g || !r) return;

    const applyTransforms = () => {
      g.scrollTop = ta.scrollTop;
      r.scrollTop = ta.scrollTop;
      g.scrollLeft = ta.scrollLeft;
      r.scrollLeft = ta.scrollLeft;
      if (gh) {
        // move the ghost overlay with the content
        gh.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
      }
    };

    const onScroll = () => applyTransforms();

    // set initial position
    applyTransforms();

    ta.addEventListener("scroll", onScroll, { passive: true });
    return () => ta.removeEventListener("scroll", onScroll);
  }, []);

  // ------- Measure wrapped heights to build per-line offsets
  const recomputeHeights = useCallback(() => {
    const ta = taRef.current,
      ruler = rulerRef.current;
    if (!ta || !ruler) return;

    const cs = getComputedStyle(ta);
    const lhVar = cs.getPropertyValue("--editor-row").trim();
    const lineHeightPx =
      (lhVar.endsWith("px") ? parseFloat(lhVar) : NaN) ||
      Math.round(parseFloat(cs.lineHeight || "0")) ||
      20;

    const nodes = Array.from(ruler.querySelectorAll<HTMLDivElement>(".rline"));
    const rawHeights = nodes.map((n) => n.getBoundingClientRect().height);

    const lineHeights = rawHeights.map((h) => {
      const rows = Math.max(1, Math.round((h + 0.25) / lineHeightPx));
      return rows * lineHeightPx;
    });

    // clamp final height to scrollHeight to avoid drift
    const sum = lineHeights.reduce((a, b) => a + b, 0);
    const target = ta.scrollHeight;
    const diff = sum - target;
    if (lineHeights.length && Math.abs(diff) > 0) {
      const last = lineHeights.length - 1;
      lineHeights[last] = Math.max(lineHeightPx, lineHeights[last] - diff);
    }

    setGutterHeights(lineHeights);
  }, []);

  useEffect(() => {
    recomputeHeights();
  }, [value, recomputeHeights]);

  useEffect(() => {
    const ro = new ResizeObserver(() => recomputeHeights());
    if (taRef.current) ro.observe(taRef.current);
    return () => ro.disconnect();
  }, [recomputeHeights]);

  // ------- Offsets table + helpers
  const rowPx = useMemo(() => {
    const ta = taRef.current;
    if (!ta) return 20;
    const cs = getComputedStyle(ta);
    const lhVar = cs.getPropertyValue("--editor-row").trim();
    return (
      (lhVar.endsWith("px") ? parseFloat(lhVar) : NaN) ||
      Math.round(parseFloat(cs.lineHeight || "0")) ||
      20
    );
  }, [value]);

  const offsets = useMemo(() => {
    const out: number[] = [0];
    for (let i = 0; i < logicalLines.length; i++) {
      out.push(out[i] + (gutterHeights[i] ?? rowPx));
    }
    return out; // offsets[i] = pixel top of line i
  }, [logicalLines.length, gutterHeights, rowPx]);

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

  const scrollToLine = (line: number, align: "top" | "center" | "nearest" = "top") => {
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
      const centerTop = Math.max(0, top - Math.round((ta.clientHeight - rowPx) / 2));
      const deltaCenter = Math.abs(curr - centerTop);
      target = deltaCenter < deltaTop ? centerTop : top;
    }
    ta.scrollTop = target;
  };

  // expose API
  useImperativeHandle(
    ref,
    (): EditorApi => ({
      scrollToLine,
      getTopVisibleLine,
      getTotalLines: () => logicalLines.length,
    }),
    [scrollToLine, getTopVisibleLine, logicalLines.length]
  );

  return (
    <div className="editor">
      <div className="editor-header">
        <span>{label}</span>
        <div className="editor-actions">
          <button
            type="button"
            className={`link-btn ${linkScroll ? "active" : ""}`}
            onClick={onToggleLinkScroll}
            title={linkScroll ? "Unlink scroll" : "Link scroll"}
          >
            🔗
          </button>
          <div className="spacer" />
          <button
            type="button"
            className="nav-btn"
            onClick={onPrevChange}
            title="Previous change"
          >
            ←
          </button>
          <button
            type="button"
            className="nav-btn"
            onClick={onNextChange}
            title="Next change"
          >
            →
          </button>
        </div>
      </div>

      <div className="editor-body">
        <div className="ln-gutter" ref={gutRef}>
          {logicalLines.map((_, i) => (
            <div
              key={i}
              className="ln"
              style={{ height: (gutterHeights[i] ?? "var(--editor-row)") as any }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        <div className="ln-wrap">
          {/* ghost overlays for hovers */}
          <div className="ln-ghosts" ref={ghostRef} aria-hidden="true">
            {ghostRanges.map((r, idx) => {
              const top = offsets[clampLine(r.from)] ?? 0;
              const bottom = offsets[clampLine(r.to + 1)] ?? offsets[offsets.length - 1] ?? 0;
              const height = Math.max(0, bottom - top);
              return <div key={idx} className="ln-ghost" style={{ top, height }} />;
            })}
          </div>

          <textarea
            ref={taRef}
            className="ln-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            wrap="soft"
          />

          {/* hidden mirror for measuring wrap */}
          <div className="ln-ruler" ref={rulerRef} aria-hidden="true">
            {logicalLines.map((line, i) => (
              <div key={i} className="rline">
                {line.length ? line : "\u00A0"}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
