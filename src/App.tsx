import { useMemo, useRef, useState } from "react";
import "./App.css";

import type { DiffResult } from "./types/diff";
import { invokeDiff } from "./services/diff.service";
import { Editor, type EditorApi } from "./components/Editor";
import { DiffView } from "./components/DiffView";
import { PlayIcon, RefreshIcon } from "./components/Icons";
import { TopBar } from "./components/TopBar";

// NEW: layout + recent-diffs
import { AppShell } from "./components/Layout/AppShell";
import { RecentDiffsProvider, useRecentDiffs } from "./state/recent-diffs";

const INITIAL_LEFT = "hello\nworld\n123\nhello\nworld\n123";
const INITIAL_RIGHT = "hello\nthere\nworld\nsdsadfasdsd\nhello\nworld\n123";

/** Build a line-map from A→B (0-based), snapping deletes to nearest B line. */
function buildLineMapAtoB(diff: DiffResult | null, aTotal: number, bTotal: number) {
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

    // fill pre-hunk equal region with current delta
    const delta = bIdx - aIdx;
    for (let i = aIdx; i < aStart; i++) {
      map[i] = clamp(i + delta, bTotal);
    }

    // walk inside hunk
    aIdx = aStart;
    bIdx = bStart;
    for (const ln of h.lines) {
      if (ln.op === "equal") {
        map[aIdx] = clamp(bIdx, bTotal);
        aIdx++;
        bIdx++;
      } else if (ln.op === "delete") {
        // no corresponding B line; snap to current bIdx
        map[aIdx] = clamp(bIdx, bTotal);
        aIdx++;
      } else if (ln.op === "insert") {
        bIdx++;
      }
    }
  }

  // tail after last hunk
  const tailDelta = bIdx - aIdx;
  for (let i = aIdx; i < aTotal; i++) {
    map[i] = clamp(i + tailDelta, bTotal);
  }

  return (i: number) => map[clamp(i, aTotal)];
}

// Inner app so we can use the provider cleanly
function DiffApp() {
  const [left, setLeft] = useState(INITIAL_LEFT);
  const [right, setRight] = useState(INITIAL_RIGHT);
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { add, items } = useRecentDiffs();

  const leftApi = useRef<EditorApi | null>(null);
  const rightApi = useRef<EditorApi | null>(null);

  const [linkScroll, setLinkScroll] = useState(false);
  const [currentHunk, setCurrentHunk] = useState(0);
  const [ghostA, setGhostA] = useState<{ from: number; to: number }[]>([]);
  const [ghostB, setGhostB] = useState<{ from: number; to: number }[]>([]);

  const aTotal = useMemo(() => left.split("\n").length, [left]);
  const bTotal = useMemo(() => right.split("\n").length, [right]);

  const mapAtoB = useMemo(() => buildLineMapAtoB(diff, aTotal, bTotal), [diff, aTotal, bTotal]);
  const mapBtoA = useMemo(
    () =>
      buildLineMapAtoB(
        diff
          ? {
              ...diff,
              hunks: diff.hunks.map((h) => ({
                a_start: h.b_start,
                a_lines: h.b_lines,
                b_start: h.a_start,
                b_lines: h.a_lines,
                lines: h.lines.map((ln) =>
                  ln.op === "insert"
                    ? { ...ln, op: "delete" as const }
                    : ln.op === "delete"
                    ? { ...ln, op: "insert" as const }
                    : ln
                ),
              })),
            }
          : null,
        bTotal,
        aTotal
      ),
    [diff, aTotal, bTotal]
  );

  async function runDiff() {
    setLoading(true);
    setError(null);
    try {
      const res = await invokeDiff(left, right, { context_lines: 2 });
      setDiff(res);
      setCurrentHunk(0);

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
    setCurrentHunk(0);
    setGhostA([]);
    setGhostB([]);
  }

  // Open a past diff from the sidebar history
  function openFromHistory(id: string) {
    const hit = items.find((i) => i.meta.id === id);
    if (!hit) return;
    if (typeof hit.aText === "string") setLeft(hit.aText);
    if (typeof hit.bText === "string") setRight(hit.bText);
    setDiff(hit.result);
    setCurrentHunk(0);
  }

  // center both editors on the chosen hunk (first changed line), align center
  function centerOnHunk(index: number) {
    if (!diff) return;
    const h = diff.hunks[index];
    if (!h) return;
    const aLine = Math.max(0, h.a_start - 1);
    const bLine = mapAtoB(aLine);

    leftApi.current?.scrollToLine(aLine, "center");
    rightApi.current?.scrollToLine(bLine, "center");
    setCurrentHunk(index);
  }

  // Link scroll (line-aware). Preserve "top-of-viewport" coupling.
  const reentrant = useRef(false);
  function handleLeftScroll(info: { topLine: number }) {
    if (!linkScroll || reentrant.current) return;
    const target = mapAtoB(info.topLine);
    reentrant.current = true;
    rightApi.current?.scrollToLine(target, "top");
    reentrant.current = false;
  }
  function handleRightScroll(info: { topLine: number }) {
    if (!linkScroll || reentrant.current) return;
    const target = mapBtoA(info.topLine);
    reentrant.current = true;
    leftApi.current?.scrollToLine(target, "top");
    reentrant.current = false;
  }

  const canRunDiff =
    left.trim().length > 0 && right.trim().length > 0 && left !== right;

  return (
    <AppShell onOpenDiff={openFromHistory}>
      <div className="app-grid">
        <TopBar diff={diff} />

        <Editor
          ref={leftApi as any}
          label="Original"
          value={left}
          onChange={setLeft}
          linkScroll={linkScroll}
          onToggleLinkScroll={() => setLinkScroll((v) => !v)}
          onPrevChange={() => centerOnHunk(Math.max(0, currentHunk - 1))}
          onNextChange={() =>
            centerOnHunk(diff ? Math.min(diff.hunks.length - 1, currentHunk + 1) : 0)
          }
          onScrollLines={(i) => handleLeftScroll({ topLine: i.topLine })}
          ghostRanges={ghostA}
        />

        <Editor
          ref={rightApi as any}
          label="New"
          value={right}
          onChange={setRight}
          linkScroll={linkScroll}
          onToggleLinkScroll={() => setLinkScroll((v) => !v)}
          onPrevChange={() => centerOnHunk(Math.max(0, currentHunk - 1))}
          onNextChange={() =>
            centerOnHunk(diff ? Math.min(diff.hunks.length - 1, currentHunk + 1) : 0)
          }
          onScrollLines={(i) => handleRightScroll({ topLine: i.topLine })}
          ghostRanges={ghostB}
        />

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
          <DiffView
            diff={diff}
            currentIndex={currentHunk}
            onJumpTo={(idx) => centerOnHunk(idx)}
            onHoverHunk={(h) => {
              if (!h || h.index == null) {
                setGhostA([]);
                setGhostB([]);
              } else {
                setGhostA(h.a ? [h.a] : []);
                setGhostB(h.b ? [h.b] : []);
              }
            }}
          />
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
