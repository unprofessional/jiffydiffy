// src/components/Editor/TextAreaRuler.tsx
import type { RefObject, MutableRefObject } from "react";
import { useHighlight } from "../../features/syntax/hooks/use-highlight";

type GhostRange = { from: number; to: number };
type RefLike<T extends HTMLElement> = RefObject<T | null> | MutableRefObject<T | null>;

export function TextAreaRuler({
  taRef, rulerRef, ghostRef,
  value, onChange, logicalLines, ghostRanges, offsets, clampLine,
  // NEW:
  highlight = true,
  language = "auto",
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
  highlight?: boolean;
  /** "auto" or any registered language id, e.g. "typescript" */
  language?: "auto" | string;
}) {
  // Compute highlighted HTML (one pass across the entire buffer)
  const { linesHtml, language: detected } = useHighlight(value, language);

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

      <div className="ln-ruler" ref={rulerRef as any} aria-hidden="true" data-lang={detected}>
        {logicalLines.map((line, i) => (
          <div
            key={i}
            className="rline hljs"              // hljs theme selectors
            // If highlighting, inject precomputed HTML; otherwise show plain text
            {...(highlight
              ? { dangerouslySetInnerHTML: { __html: linesHtml[i] ?? "&nbsp;" } }
              : { children: line.length ? line : "\u00A0" })}
          />
        ))}
      </div>
    </div>
  );
}
