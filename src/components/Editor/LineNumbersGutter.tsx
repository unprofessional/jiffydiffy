import { forwardRef } from "react";

export const LineNumbersGutter = forwardRef<HTMLDivElement, {
  lineCount: number;
  gutterHeights: number[];
  /** style applied to each .ln to preserve fallback var(--editor-row) when height is unknown */
  rowVarStyle?: React.CSSProperties;
}>(({ lineCount, gutterHeights, rowVarStyle }, ref) => {
  return (
    <div className="ln-gutter line-numbers" ref={ref}>
      {Array.from({ length: lineCount }).map((_, i) => (
        <div
          key={i}
          className="ln"
          style={{ height: (gutterHeights[i] ?? "var(--editor-row)") as any, ...rowVarStyle }}
        >
          {i + 1}
        </div>
      ))}
    </div>
  );
});
