import { useState } from "react";
import "./App.css";

import type { DiffResult } from "./types/diff";
import { invokeDiff } from "./services/diff.service";
import { Editor } from "./components/Editor";
import { DiffView } from "./components/DiffView";
import { PlayIcon, RefreshIcon } from "./components/Icons";
import { TopBar } from "./components/TopBar";

const INITIAL_LEFT  = "hello\nworld\n123\nhello\nworld\n123";
const INITIAL_RIGHT = "hello\nthere\nworld\nsdsadfasdsd\nhello\nworld\n123";

// const INITIAL_LEFT  = "";
// const INITIAL_RIGHT = "";

export default function App() {
  const [left, setLeft]   = useState(INITIAL_LEFT);
  const [right, setRight] = useState(INITIAL_RIGHT);
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runDiff() {
    setLoading(true);
    setError(null);
    try {
      const res = await invokeDiff(left, right, { context_lines: 2 });
      setDiff(res);
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

  const canRunDiff =
    left.trim().length > 0 &&
    right.trim().length > 0 &&
    left !== right;

  return (
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
  );
}
