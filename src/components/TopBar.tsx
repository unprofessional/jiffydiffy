import type { DiffResult } from "../types/diff";

type Stats = {
  added: number;
  removed: number;
  unchanged: number;
  total: number;
  similarityPct: number; // 0..100
};

function computeStats(diff: DiffResult | null): Stats {
  if (!diff) return { added: 0, removed: 0, unchanged: 0, total: 0, similarityPct: 0 };

  let added = 0;
  let removed = 0;
  let unchanged = 0;

  for (const h of diff.hunks ?? []) {
    for (const line of h.lines ?? []) {
      if (line.op === "insert") added += 1;
      else if (line.op === "delete") removed += 1;
      else unchanged += 1; // "equal"
    }
  }

  const total = added + removed + unchanged;
  const similarityPct = total === 0 ? 100 : Math.round((unchanged / total) * 100);

  return { added, removed, unchanged, total, similarityPct };
}

export function TopBar({ diff }: { diff: DiffResult | null }) {
  const { added, removed, unchanged, similarityPct } = computeStats(diff);

  return (
    <div className="topbar">
      <div className="brand">
        <span className="brand-mark">JiffyDiffy</span>
      </div>

      <div className="stats">
        <span className="badge badge-add" title="Lines added">+{added}</span>
        <span className="badge badge-del" title="Lines removed">-{removed}</span>
        <span className="badge badge-eq" title="Lines unchanged">{unchanged}</span>
        <span className="divider" aria-hidden>•</span>
        <span className="badge badge-pct" title="Similarity">{similarityPct}%</span>
      </div>
    </div>
  );
}
