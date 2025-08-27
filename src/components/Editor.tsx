import { useEffect, useRef, useMemo, useState, useCallback } from "react";

export function Editor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const gutRef = useRef<HTMLDivElement | null>(null);
  const rulerRef = useRef<HTMLDivElement | null>(null);

  const [gutterHeights, setGutterHeights] = useState<number[]>([]);
  const logicalLines = useMemo(() => value.split("\n"), [value]);

  // keep gutter + ruler in sync with textarea scrolling
  useEffect(() => {
    const ta = taRef.current, g = gutRef.current, r = rulerRef.current;
    if (!ta || !g || !r) return;

    const onScroll = () => {
      g.scrollTop = ta.scrollTop;
      r.scrollTop = ta.scrollTop;
    };
    ta.addEventListener("scroll", onScroll);
    return () => ta.removeEventListener("scroll", onScroll);
  }, []);

  const recomputeHeights = useCallback(() => {
    const ta = taRef.current, ruler = rulerRef.current;
    if (!ta || !ruler) return;

    // ⚙️ use integer line-height from CSS custom prop (fallback to computed)
    const cs = getComputedStyle(ta);
    const lhVar = cs.getPropertyValue("--editor-row").trim();
    const lineHeightPx =
      (lhVar.endsWith("px") ? parseFloat(lhVar) : NaN) ||
      Math.round(parseFloat(cs.lineHeight || "0")) ||
      20; // sane default

    // measure each mirrored line via bounding rect (sub-pixel safe)
    const nodes = Array.from(ruler.querySelectorAll<HTMLDivElement>(".rline"));
    const rawHeights = nodes.map((n) => n.getBoundingClientRect().height);

    // convert to integer multiples of lineHeightPx
    const lineHeights = rawHeights.map((h) => {
      // add a tiny epsilon before division to avoid 1px gaps from 19.999…
      const rows = Math.max(1, Math.round((h + 0.25) / lineHeightPx));
      return rows * lineHeightPx;
    });

    // 🧮 clamp the last line so gutter total matches textarea scrollHeight
    const sum = lineHeights.reduce((a, b) => a + b, 0);
    const target = ta.scrollHeight; // includes padding
    const diff = sum - target;

    if (lineHeights.length && Math.abs(diff) > 0) {
      // adjust last line height downward/upward to match exactly
      lineHeights[lineHeights.length - 1] = Math.max(
        lineHeightPx,
        lineHeights[lineHeights.length - 1] - diff
      );
    }

    setGutterHeights(lineHeights);
  }, []);

  // recompute on content + size changes
  useEffect(() => {
    recomputeHeights();
  }, [value, recomputeHeights]);

  useEffect(() => {
    const ro = new ResizeObserver(() => recomputeHeights());
    if (taRef.current) ro.observe(taRef.current);
    return () => ro.disconnect();
  }, [recomputeHeights]);

  return (
    <div className="editor">
      <div className="editor-header">{label}</div>

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
}
