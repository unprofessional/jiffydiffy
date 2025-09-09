// src/App.tsx
import "./App.css";
import { TopBar } from "./components/TopBar";
import { Editor } from "./components/Editor/Editor";
import { DiffView } from "./components/DiffView";
import { AppShell } from "./components/Layout/AppShell";
import { Controls } from "./components/Controls";
import { RecentDiffsProvider } from "./state/recent-diffs";

import { useScrollSync } from "./features/diff/use-scroll-sync";
import { useDiffApp } from "./features/diff/use-diff-app";

// NEW: lock "Run Diff" after a successful run until panes change
import { useDiffRunLock } from "./hooks/use-diff-run-lock";
// NEW: hash the rendered diff for dedupe
import { makeDiffHash } from "./utils/diff-hash";
// NEW: stash into recents using the hash
import { useRecentDiffs } from "./state/recent-diffs";

function DiffApp() {
  const {
    left, right, setLeft, setRight,
    diff, loading, error, currentHunk,
    linkScroll, setLinkScroll,
    ghostA, setGhostA, ghostB, setGhostB,
    leftApi, rightApi,
    canRunDiff, mapAtoB, mapBtoA,
    runDiff, resetAll, openFromHistory, centerOnHunk,
  } = useDiffApp();

  const { add: addRecent } = useRecentDiffs();

  const { left: onLeftScroll, right: onRightScroll } = useScrollSync({
    linkScroll, mapAtoB, mapBtoA, leftApi, rightApi
  });

  // ---- Run-lock wiring ----
  const { isLocked, noteRun, updateDirty } = useDiffRunLock();

  // any edit to left/right toggles lock off (until next run)
  const onLeftChange = (v: string) => {
    setLeft(v);
    updateDirty(v, right); // if you later expose options, pass as 3rd arg
  };
  const onRightChange = (v: string) => {
    setRight(v);
    updateDirty(left, v);
  };

  // combine existing `canRunDiff` with our lock
  const canRun = canRunDiff && !isLocked;

  // wrap original run so we can (1) lock, (2) hash+dedupe recents
  const onRun = async () => {
    await runDiff(); // computes and sets `diff`
    noteRun({ left, right });

    // if a diff is present, compute a deterministic fingerprint & stash
    // NOTE: we compute from the *rendered* diff structure, not raw inputs.
    // If you later expose diff-affecting options to App, pass them as 2nd arg.
    if (diff) {
      try {
        const hash = await makeDiffHash(diff);
        // attach for debugging/inspect if you want
        (diff as any).__hash = hash;

        addRecent({
          result: diff,
          aText: left,
          bText: right,
          meta: {
            aLabel: "Original",
            bLabel: "New",
            // previews are auto-derived in the store if omitted
          },
        });
      } catch {
        // hashing failed (very old WebView w/o crypto.subtle, etc.) — ignore
      }
    }
  };

  return (
    <AppShell onOpenDiff={openFromHistory}>
      <div className="app-grid">
        <TopBar diff={diff} />

        <Editor
          ref={leftApi as any}
          label="Original"
          value={left}
          onChange={onLeftChange}
          linkScroll={linkScroll}
          onToggleLinkScroll={() => setLinkScroll(v => !v)}
          onPrevChange={() => centerOnHunk(Math.max(0, currentHunk - 1))}
          onNextChange={() => centerOnHunk(diff ? Math.min(diff.hunks.length - 1, currentHunk + 1) : 0)}
          onScrollLines={(i) => onLeftScroll({ topLine: i.topLine })}
          ghostRanges={ghostA}
        />

        <Editor
          ref={rightApi as any}
          label="New"
          value={right}
          onChange={onRightChange}
          linkScroll={linkScroll}
          onToggleLinkScroll={() => setLinkScroll(v => !v)}
          onPrevChange={() => centerOnHunk(Math.max(0, currentHunk - 1))}
          onNextChange={() => centerOnHunk(diff ? Math.min(diff.hunks.length - 1, currentHunk + 1) : 0)}
          onScrollLines={(i) => onRightScroll({ topLine: i.topLine })}
          ghostRanges={ghostB}
        />

        <Controls
          loading={loading}
          canRunDiff={canRun}
          error={error}
          onReset={resetAll}
          onRun={onRun}
        />

        <div className="diff-container">
          <DiffView
            diff={diff}
            currentIndex={currentHunk}
            onJumpTo={(idx) => centerOnHunk(idx)}
            onHoverHunk={(h) => {
              if (!h || h.index == null) {
                setGhostA([]); setGhostB([]);
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
