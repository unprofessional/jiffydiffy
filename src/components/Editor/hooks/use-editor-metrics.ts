import { useCallback, useEffect, useMemo, useState, type RefObject, type MutableRefObject } from "react";

/** Accept either RefObject or MutableRefObject, with null current allowed. */
type RefLike<T extends HTMLElement> = RefObject<T | null> | MutableRefObject<T | null>;

/** Handles: line height detection, per-line measured heights (wrapped rows), offsets table. */
export function useEditorMetrics({
  value,
  taRef,
  rulerRef,
}: {
  value: string;
  taRef: RefLike<HTMLTextAreaElement>;
  rulerRef: RefLike<HTMLDivElement>;
}) {
  const [gutterHeights, setGutterHeights] = useState<number[]>([]);

  // effective row height in px (from --editor-row or computed line-height)
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
  }, [taRef.current, value]); // re-evaluate when content changes

  const recomputeHeights = useCallback(() => {
    const ta = taRef.current;
    const ruler = rulerRef.current;
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
  }, [taRef, rulerRef]);

  // recompute on content change
  useEffect(() => {
    recomputeHeights();
  }, [value, recomputeHeights]);

  // recompute on resize (covers container changes; many UAs also fire on font changes)
  useEffect(() => {
    const ro = new ResizeObserver(() => recomputeHeights());
    if (taRef.current) ro.observe(taRef.current);
    return () => ro.disconnect();
  }, [recomputeHeights, taRef]);

  // cumulative offsets table
  const offsets = useMemo(() => {
    const text = value;
    const lineCount = text ? text.split("\n").length : 1;
    const out: number[] = [0];
    for (let i = 0; i < lineCount; i++) {
      out.push(out[i] + (gutterHeights[i] ?? rowPx));
    }
    return out; // offsets[i] = pixel top of line i
  }, [value, gutterHeights, rowPx]);

  return { gutterHeights, rowPx, offsets };
}
