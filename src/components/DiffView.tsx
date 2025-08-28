import { useState, type JSX } from "react";
import type { DiffResult } from "../types/diff";
import { wordDiff } from "../utils/word-diff";
import { Tokens } from "./Tokens";

type HoverPayload = {
  index: number | null;
  a: { from: number; to: number } | null;
  b: { from: number; to: number } | null;
};

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
    let aLn = h.a_start;
    let bLn = h.b_start;

    for (let i = 0; i < h.lines.length; i++) {
      const cur = h.lines[i];
      const next = h.lines[i + 1];

      const isDelIns = cur && next && cur.op === "delete" && next.op === "insert";
      const isInsDel = cur && next && cur.op === "insert" && next.op === "delete";

      if (isDelIns || isInsDel) {
        const delText = isDelIns ? cur!.text : next!.text;
        const insText = isDelIns ? next!.text : cur!.text;
        const { aTokens, bTokens } = wordDiff(delText, insText);

        rows.push(
          <div key={`h${hi}-p${i}`} className="row replace">
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
        aLn++; bLn++; i++; // consumed the pair
        continue;
      }

      if (cur.op === "equal") {
        rows.push(
          <div key={`h${hi}-e${i}`} className="row equal">
            <span className="gA">{aLn}</span>
            <span className="cell cellA">{cur.text || " "}</span>
            <span className="gB">{bLn}</span>
            <span className="cell cellB">{cur.text || " "}</span>
          </div>
        );
        aLn++; bLn++;
      } else if (cur.op === "delete") {
        rows.push(
          <div key={`h${hi}-d${i}`} className="row delete">
            <span className="gA">{aLn}</span>
            <span className="cell cellA delete">{cur.text || " "}</span>
            <span className="gB"></span>
            <span className="cell cellB"></span>
          </div>
        );
        aLn++;
      } else {
        // insert
        rows.push(
          <div key={`h${hi}-i${i}`} className="row insert">
            <span className="gA"></span>
            <span className="cell cellA"></span>
            <span className="gB">{bLn}</span>
            <span className="cell cellB insert">{cur.text || " "}</span>
          </div>
        );
        bLn++;
      }
    }

    const isCollapsed = !!collapsed[hi];
    const isActive = currentIndex === hi;

    // precompute hover ranges for ghost-highlighting in editors
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

  return <>{rendered}</>;
}
