import { useState } from "react";
import "./App.css";

import type { DiffResult } from "./types/diff";
import { invokeDiff } from "./services/diff.service";
import { Editor } from "./components/Editor";
import { DiffView } from "./components/DiffView";

export default function App() {
  const [left, setLeft]   = useState("hello\nworld\n123\nhello\nworld\n123");
  const [right, setRight] = useState("hello\nthere\nworld\nsdsadfasdsd\nhello\nworld\n123");
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

  return (
    <div className="app-grid">
      <h1 className="app-title">JiffyDiffy — diff test</h1>

      <Editor label="Original" value={left} onChange={setLeft} />
      <Editor label="New" value={right} onChange={setRight} />

      <div className="controls-row">
        <button onClick={runDiff} disabled={loading}>
          {loading ? "Diffing…" : "Run Diff"}
        </button>
        {error && <span className="error-text">Error: {error}</span>}
      </div>

      <div className="diff-container">
        <DiffView diff={diff} />
      </div>
    </div>
  );
}
