// src/components/DiffView.tsx
import { useState, type JSX } from "react";
import type { DiffResult } from "../types/diff";
import { wordDiff } from "../utils/word-diff";
import { Tokens } from "./Tokens";

type HoverPayload = {
  index: number | null;
  a: { from: number; to: number } | null;
  b: { from: number; to: number } | null;
};

type LineOp = "equal" | "insert" | "delete";
type Line = { op: LineOp; text: string };

export function DiffView({
  diff,
  currentIndex,
  onJumpTo,
  onHoverHunk,
}: {
  diff: DiffResult | null;
  currentIndex?: number;
  onJumpTo?: (index: number) => void;
  onHoverHunk?: (opts: HoverPayload) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  if (!diff) return <em>No changes (or binary/missing)</em>;

  const rendered = diff.hunks.map((h, hi) => {
    const rows: JSX.Element[] = [];

    // 1-based line numbers from backend
    let aLn = h.a_start;
    let bLn = h.b_start;

    const lines = h.lines as Line[];

    // Helpers to take runs of the same op
    let i = 0;
    const takeRun = (want: LineOp): Line[] => {
      const out: Line[] = [];
      while (i < lines.length && lines[i].op === want) out.push(lines[i++]);
      return out;
    };

    while (i < lines.length) {
      const op = lines[i].op;

      // Equal: 1:1 pairing across the whole run.
      if (op === "equal") {
        const eq = takeRun("equal");
        for (let k = 0; k < eq.length; k++) {
          const l = eq[k];
          rows.push(
            <div key={`h${hi}-e${i}-${k}`} className="row equal">
              <span className="gA">{aLn}</span>
              <span className="cell cellA">{l.text || " "}</span>
              <span className="gB">{bLn}</span>
              <span className="cell cellB">{l.text || " "}</span>
            </div>
          );
          aLn++; bLn++;
        }
        continue;
      }

      // Change block: collect *runs* of deletes and inserts (either order),
      // then zip them row-by-row so DOM rows align like GitHub.
      let delRun: Line[] = [];
      let insRun: Line[] = [];

      if (op === "delete") {
        delRun = takeRun("delete");
        if (i < lines.length && lines[i].op === "insert") insRun = takeRun("insert");
      } else if (op === "insert") {
        insRun = takeRun("insert");
        if (i < lines.length && lines[i].op === "delete") delRun = takeRun("delete");
      }

      const n = Math.max(delRun.length, insRun.length);
      for (let k = 0; k < n; k++) {
        const delLine = delRun[k];
        const insLine = insRun[k];

        if (delLine && insLine) {
          // Replace row: show word-level diff
          const { aTokens, bTokens } = wordDiff(delLine.text, insLine.text);
          rows.push(
            <div key={`h${hi}-r${i}-${k}`} className="row replace">
              <span className="gA">{aLn}</span>
              <span className="cell cellA delete">
                <Tokens tokens={aTokens.map(t => ({ t: t.t, del: t.del }))} />
              </span>
              <span className="gB">{bLn}</span>
              <span className="cell cellB insert">
                <Tokens tokens={bTokens.map(t => ({ t: t.t, ins: t.ins }))} />
              </span>
            </div>
          );
          aLn++; bLn++;
        } else if (delLine) {
          // Pure deletion with blank right
          rows.push(
            <div key={`h${hi}-d${i}-${k}`} className="row delete">
              <span className="gA">{aLn}</span>
              <span className="cell cellA delete">{delLine.text || " "}</span>
              <span className="gB"></span>
              <span className="cell cellB"></span>
            </div>
          );
          aLn++;
        } else if (insLine) {
          // Pure insertion with blank left
          rows.push(
            <div key={`h${hi}-i${i}-${k}`} className="row insert">
              <span className="gA"></span>
              <span className="cell cellA"></span>
              <span className="gB">{bLn}</span>
              <span className="cell cellB insert">{insLine.text || " "}</span>
            </div>
          );
          bLn++;
        }
      }
    }

    const isCollapsed = !!collapsed[hi];
    const isActive = currentIndex === hi;

    const aRange =
      h.a_lines > 0
        ? { from: h.a_start - 1, to: h.a_start - 1 + (h.a_lines - 1) }
        : null;
    const bRange =
      h.b_lines > 0
        ? { from: h.b_start - 1, to: h.b_start - 1 + (h.b_lines - 1) }
        : null;

    const emitHover = (enter: boolean) =>
      onHoverHunk?.({
        index: enter ? hi : null,
        a: enter ? aRange : null,
        b: enter ? bRange : null,
      });

    return (
      <div
        key={`hunk-${hi}`}
        className={`diff-wrap ${isActive ? "active" : ""}`}
        style={{ marginTop: 12 }}
        onMouseEnter={() => emitHover(true)}
        onMouseLeave={() => emitHover(false)}
        data-collapsed={isCollapsed ? "true" : "false"}
      >
        <div className="diff-header">
          <button
            type="button"
            className="collapse-btn"
            onClick={() => setCollapsed(m => ({ ...m, [hi]: !m[hi] }))}
            title={isCollapsed ? "Expand hunk" : "Collapse hunk"}
            aria-label={isCollapsed ? "Expand hunk" : "Collapse hunk"}
          >
            {isCollapsed ? "▸" : "▾"}
          </button>

          <div
            className="hunk-title"
            role="button"
            onClick={() => onJumpTo?.(hi)}
            title="Center editors on this change"
          >
            hunk {hi + 1} — A:{h.a_start},{h.a_lines} B:{h.b_start},{h.b_lines}
          </div>

          <button
            type="button"
            className="jump-btn"
            onClick={() => onJumpTo?.(hi)}
            title="Center editors on this change"
          >
            Jump
          </button>
        </div>

        {!isCollapsed && <div className="diff-body two-pane">{rows}</div>}
      </div>
    );
  });

  return <div className="diff-pane mono">{rendered}</div>;
}
