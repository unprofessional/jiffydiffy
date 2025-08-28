import type { DiffResult } from "../../types/diff";

/** Build a line-map from A→B (0-based), snapping deletes to nearest B line. */
export function buildLineMapAtoB(diff: DiffResult | null, aTotal: number, bTotal: number) {
  const clamp = (i: number, max: number) => Math.max(0, Math.min(max - 1, i));
  const map = new Array<number>(aTotal);
  for (let i = 0; i < aTotal; i++) map[i] = clamp(i, bTotal);

  if (!diff) return (i: number) => map[clamp(i, aTotal)];

  let aIdx = 0;
  let bIdx = 0;
  const hunks = diff.hunks.slice().sort((x, y) => x.a_start - y.a_start);

  for (const h of hunks) {
    const aStart = h.a_start - 1;
    const bStart = h.b_start - 1;

    // pre-hunk equal region
    const delta = bIdx - aIdx;
    for (let i = aIdx; i < aStart; i++) map[i] = clamp(i + delta, bTotal);

    // inside hunk
    aIdx = aStart;
    bIdx = bStart;
    for (const ln of h.lines) {
      if (ln.op === "equal") {
        map[aIdx] = clamp(bIdx, bTotal);
        aIdx++; bIdx++;
      } else if (ln.op === "delete") {
        map[aIdx] = clamp(bIdx, bTotal);
        aIdx++;
      } else if (ln.op === "insert") {
        bIdx++;
      }
    }
  }

  // tail
  const tailDelta = bIdx - aIdx;
  for (let i = aIdx; i < aTotal; i++) map[i] = clamp(i + tailDelta, bTotal);

  return (i: number) => map[clamp(i, aTotal)];
}

/** Build the inverse mapping B→A by swapping hunk sides. */
export function invertMap(diff: DiffResult | null, aTotal: number, bTotal: number) {
  if (!diff) return buildLineMapAtoB(null, bTotal, aTotal);
  const flipped: DiffResult = {
    ...diff,
    hunks: diff.hunks.map(h => ({
      a_start: h.b_start,
      a_lines: h.b_lines,
      b_start: h.a_start,
      b_lines: h.a_lines,
      lines: h.lines.map(ln =>
        ln.op === "insert" ? { ...ln, op: "delete" as const }
      : ln.op === "delete" ? { ...ln, op: "insert" as const }
      : ln),
    })),
  };
  return buildLineMapAtoB(flipped, bTotal, aTotal);
}
