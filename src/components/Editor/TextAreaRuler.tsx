import type { RefObject, MutableRefObject } from "react";

type GhostRange = { from: number; to: number };
type RefLike<T extends HTMLElement> = RefObject<T | null> | MutableRefObject<T | null>;

export function TextAreaRuler({
  taRef,
  rulerRef,
  ghostRef,
  value,
  onChange,
  logicalLines,
  ghostRanges,
  offsets,
  clampLine,
}: {
  taRef: RefLike<HTMLTextAreaElement>;
  rulerRef: RefLike<HTMLDivElement>;
  ghostRef: RefLike<HTMLDivElement>;
  value: string;
  onChange: (v: string) => void;
  logicalLines: string[];
  ghostRanges: GhostRange[];
  offsets: number[];
  clampLine: (i: number) => number;
}) {
  return (
    <div className="ln-wrap">
      <div className="ln-ghosts" ref={ghostRef as any} aria-hidden="true">
        {ghostRanges.map((r, idx) => {
          const top = offsets[clampLine(r.from)] ?? 0;
          const bottom = offsets[clampLine(r.to + 1)] ?? offsets[offsets.length - 1] ?? 0;
          const height = Math.max(0, bottom - top);
          return <div key={idx} className="ln-ghost" style={{ top, height }} />;
        })}
      </div>

      <textarea
        ref={taRef as any}
        className="ln-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        wrap="soft"
      />

      <div className="ln-ruler" ref={rulerRef as any} aria-hidden="true">
        {logicalLines.map((line, i) => (
          <div key={i} className="rline">
            {line.length ? line : "\u00A0"}
          </div>
        ))}
      </div>
    </div>
  );
}
