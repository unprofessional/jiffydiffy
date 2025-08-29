// src/components/TopBar.tsx
import { useMemo, useState } from "react";
import type { DiffResult } from "../types/diff";
import { wordDiff } from "../utils/word-diff";
import { useFontScale, type FontSize } from "../state/font-scale";

type Stats = {
  added: number;
  removed: number;
  unchanged: number;
  total: number;
  similarityPct: number; // 0..100
};

type ViewMode = "coder" | "writer";

function computeCoderStats(diff: DiffResult | null): Stats {
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

// Simple word counter (writer view). Treats letter/number clusters as words.
function countWords(s: string): number {
  const m = s.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g);
  return m ? m.length : 0;
}

function computeWriterStats(diff: DiffResult | null): Stats {
  if (!diff) return { added: 0, removed: 0, unchanged: 0, total: 0, similarityPct: 0 };

  let added = 0;
  let removed = 0;
  let unchanged = 0;

  for (const h of diff.hunks ?? []) {
    for (let i = 0; i < h.lines.length; i++) {
      const cur = h.lines[i];
      const nxt = h.lines[i + 1];

      const isDelIns = cur && nxt && cur.op === "delete" && nxt.op === "insert";
      const isInsDel = cur && nxt && cur.op === "insert" && nxt.op === "delete";

      if (isDelIns || isInsDel) {
        // Use token-level diff for a more faithful writer metric
        const delText = isDelIns ? cur!.text : nxt!.text;
        const insText = isDelIns ? nxt!.text : cur!.text;
        const { aTokens, bTokens } = wordDiff(delText, insText);

        const delCount = aTokens.filter((t: any) => t.del).length;
        const insCount = bTokens.filter((t: any) => t.ins).length;
        const aUnch = aTokens.filter((t: any) => !t.del && !t.ins).length;
        const bUnch = bTokens.filter((t: any) => !t.del && !t.ins).length;
        const unchCount = Math.min(aUnch, bUnch); // avoid double-counting

        removed += delCount;
        added += insCount;
        unchanged += unchCount;

        i++; // consumed the pair
        continue;
      }

      if (cur.op === "equal") {
        unchanged += countWords(cur.text || "");
      } else if (cur.op === "insert") {
        added += countWords(cur.text || "");
      } else {
        removed += countWords(cur.text || "");
      }
    }
  }

  const total = added + removed + unchanged;
  const similarityPct = total === 0 ? 100 : Math.round((unchanged / total) * 100);

  return { added, removed, unchanged, total, similarityPct };
}

export function TopBar({
  diff,
  initialMode = "coder",
  onModeChange,
}: {
  diff: DiffResult | null;
  /** optional seed if you start controlled later */
  initialMode?: ViewMode;
  /** optional hook for lifting state later */
  onModeChange?: (m: ViewMode) => void;
}) {
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const { size, setSize } = useFontScale(); // ← global S/M/L font scale

  const stats = useMemo(
    () => (mode === "coder" ? computeCoderStats(diff) : computeWriterStats(diff)),
    [mode, diff]
  );

  const { added, removed, unchanged, similarityPct } = stats;

  const labelAdd = mode === "coder" ? "Lines added" : "Words added";
  const labelDel = mode === "coder" ? "Lines removed" : "Words removed";
  const labelEq  = mode === "coder" ? "Lines unchanged" : "Words unchanged";

  const switchTo = (m: ViewMode) => {
    setMode(m);
    onModeChange?.(m);
  };

  const setFont = (s: FontSize) => setSize(s);

  return (
    <div className="topbar">
      <div className="brand">
        <span className="brand-mark">JiffyDiffy</span>
      </div>

      <div className="view-switch" role="tablist" aria-label="Statistics view mode">
        <button
          role="tab"
          aria-selected={mode === "coder"}
          className={`seg ${mode === "coder" ? "active" : ""}`}
          onClick={() => switchTo("coder")}
          title="Developer-oriented stats (lines)"
        >
          Coder
        </button>
        <button
          role="tab"
          aria-selected={mode === "writer"}
          className={`seg ${mode === "writer" ? "active" : ""}`}
          onClick={() => switchTo("writer")}
          title="Writer-oriented stats (words)"
        >
          Writer
        </button>
      </div>

      <div className="stats" aria-live="polite">
        <span className="badge badge-add" title={labelAdd}>+{added}</span>
        <span className="badge badge-del" title={labelDel}>-{removed}</span>
        <span className="badge badge-eq"  title={labelEq}>{unchanged}</span>
        <span className="divider" aria-hidden>•</span>
        <span className="badge badge-pct" title="Similarity">{similarityPct}%</span>
      </div>

      {/* S / M / L font size */}
      <div className="font-switch" role="group" aria-label="Font size">
        <button
          className={`seg ${size === "S" ? "active" : ""}`}
          onClick={() => setFont("S")}
          title="Small (Ctrl/Cmd + - to decrease)"
          aria-pressed={size === "S"}
        >
          S
        </button>
        <button
          className={`seg ${size === "M" ? "active" : ""}`}
          onClick={() => setFont("M")}
          title="Medium (Ctrl/Cmd + 0 to reset)"
          aria-pressed={size === "M"}
        >
          M
        </button>
        <button
          className={`seg ${size === "L" ? "active" : ""}`}
          onClick={() => setFont("L")}
          title="Large (Ctrl/Cmd + = to increase)"
          aria-pressed={size === "L"}
        >
          L
        </button>
      </div>
    </div>
  );
}
