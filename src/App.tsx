import { useState } from "react";
import "./App.css";

import type { DiffResult } from "./types/diff";
import { invokeDiff } from "./services/diff.service";
import { Editor } from "./components/Editor";
import { DiffView } from "./components/DiffView";
import { PlayIcon, RefreshIcon } from "./components/Icons";
import { TopBar } from "./components/TopBar";

// NEW: layout + recent-diffs
import { AppShell } from "./components/Layout/AppShell";
import { RecentDiffsProvider, useRecentDiffs } from "./state/recent-diffs";

const INITIAL_LEFT  = "hello\nworld\n123\nhello\nworld\n123";
const INITIAL_RIGHT = "hello\nthere\nworld\nsdsadfasdsd\nhello\nworld\n123";

// Inner app so we can use the provider cleanly
function DiffApp() {
  const [left, setLeft]   = useState(INITIAL_LEFT);
  const [right, setRight] = useState(INITIAL_RIGHT);
  const [diff, setDiff]   = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const { add, items } = useRecentDiffs();

  async function runDiff() {
    setLoading(true);
    setError(null);
    try {
      const res = await invokeDiff(left, right, { context_lines: 2 });
      setDiff(res);

      // record to recent history (keeps last 5; previews auto-derived)
      add({
        result: res,
        aText: left,
        bText: right,
        meta: { aLabel: "Original", bLabel: "New" },
      });
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setDiff(null);
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    setLeft(INITIAL_LEFT);
    setRight(INITIAL_RIGHT);
    setDiff(null);
    setError(null);
  }

  // Open a past diff from the sidebar history
  function openFromHistory(id: string) {
    const hit = items.find((i) => i.meta.id === id);
    if (!hit) return;

    // restore editors if we have them
    if (typeof hit.aText === "string") setLeft(hit.aText);
    if (typeof hit.bText === "string") setRight(hit.bText);

    // and show its diff
    setDiff(hit.result);
  }


  const canRunDiff =
    left.trim().length > 0 &&
    right.trim().length > 0 &&
    left !== right;

  return (
    <AppShell onOpenDiff={openFromHistory}>
      <div className="app-grid">
        <TopBar diff={diff} />

        <Editor label="Original" value={left} onChange={setLeft} />
        <Editor label="New" value={right} onChange={setRight} />

        <div className="controls-row-wrap">
          <div className="controls">
            <div className="controls-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetAll}
                disabled={loading}
              >
                <RefreshIcon />
                <span>Reset</span>
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={runDiff}
                disabled={loading || !canRunDiff}
              >
                <PlayIcon />
                <span>{loading ? "Diffing…" : "Run Diff"}</span>
              </button>
            </div>

            {error && <div className="error-text">Error: {error}</div>}
          </div>
        </div>

        <div className="diff-container">
          <DiffView diff={diff} />
        </div>
      </div>
    </AppShell>
  );
}

export default function App() {
  return (
    <RecentDiffsProvider>
      <DiffApp />
    </RecentDiffsProvider>
  );
}
