// src/features/diff/align-side-by-side.ts
import type { DiffResult } from "../../types/diff";

type LineOp = "equal" | "insert" | "delete";
type Line = { op: LineOp; text: string };

export type Row = {
  left?:  { text: string; op: "equal" | "delete"; ln: number };
  right?: { text: string; op: "equal" | "insert";  ln: number };
};

export type AlignedHunk = {
  a_start: number;
  b_start: number;
  rows: Row[];
};

/** Pair left/right changes within a hunk so each DOM row is aligned like GitHub. */
export function alignHunk(h: DiffResult["hunks"][number]): AlignedHunk {
  const rows: Row[] = [];
  const lines = h.lines as Line[];
  let i = 0;

  let aLn = h.a_start; // 1-based
  let bLn = h.b_start;

  const takeRun = (want: LineOp): Line[] => {
    const run: Line[] = [];
    while (i < lines.length && lines[i].op === want) run.push(lines[i++]);
    return run;
  };

  while (i < lines.length) {
    const op = lines[i].op;

    if (op === "equal") {
      const eq = takeRun("equal");
      for (const l of eq) {
        rows.push({
          left:  { text: l.text, op: "equal", ln: aLn++ },
          right: { text: l.text, op: "equal", ln: bLn++ },
        });
      }
      continue;
    }

    // Typical replace block: deletes then inserts
    const delRun = (op === "delete") ? takeRun("delete") : [];
    const insRun =
      (i < lines.length && lines[i].op === "insert") ? takeRun("insert")
    : (op === "insert") ? takeRun("insert")
    : [];

    // Rare order swap: inserts first, then deletes
    if (op === "insert" && i < lines.length && lines[i].op === "delete" && delRun.length === 0) {
      delRun.push(...takeRun("delete"));
    }

    const n = Math.max(delRun.length, insRun.length);
    for (let k = 0; k < n; k++) {
      const l = delRun[k];
      const r = insRun[k];
      const row: Row = {};
      if (l) row.left  = { text: l.text, op: "delete", ln: aLn++ };
      if (r) row.right = { text: r.text, op: "insert", ln: bLn++ };
      rows.push(row);
    }
  }

  return { a_start: h.a_start, b_start: h.b_start, rows };
}

/** Convenience: align *all* hunks in a result. */
export function alignAllHunks(diff: DiffResult | null): AlignedHunk[] {
  if (!diff) return [];
  return diff.hunks.map(alignHunk);
}
