import "./App.css";
import { TopBar } from "./components/TopBar";
import { Editor } from "./components/Editor";
import { DiffView } from "./components/DiffView";
import { AppShell } from "./components/Layout/AppShell";
import { Controls } from "./components/Controls";
import { RecentDiffsProvider } from "./state/recent-diffs";

import { useScrollSync } from "./features/diff/use-scroll-sync";
import { useDiffApp } from "./features/diff/use-diff-app";

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

  const { left: onLeftScroll, right: onRightScroll } = useScrollSync({
    linkScroll, mapAtoB, mapBtoA, leftApi, rightApi
  });

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
          onChange={setRight}
          linkScroll={linkScroll}
          onToggleLinkScroll={() => setLinkScroll(v => !v)}
          onPrevChange={() => centerOnHunk(Math.max(0, currentHunk - 1))}
          onNextChange={() => centerOnHunk(diff ? Math.min(diff.hunks.length - 1, currentHunk + 1) : 0)}
          onScrollLines={(i) => onRightScroll({ topLine: i.topLine })}
          ghostRanges={ghostB}
        />

        <Controls
          loading={loading}
          canRunDiff={canRunDiff}
          error={error}
          onReset={resetAll}
          onRun={runDiff}
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
