// src/hooks/use-diff-run-lock.ts

import { useCallback, useMemo, useRef, useState } from "react";

export type RunSnapshot = {
  left: string;
  right: string;
  // include options that affect output (algo/mode/ignoreWs/etc.)
  options?: Record<string, unknown>;
};

export function useDiffRunLock() {
  const lastRunRef = useRef<RunSnapshot | null>(null);
  const [isLocked, setLocked] = useState(false);

  const noteRun = useCallback((snap: RunSnapshot) => {
    lastRunRef.current = snap;
    setLocked(true);
  }, []);

  const updateDirty = useCallback((left: string, right: string, options?: Record<string, unknown>) => {
    const last = lastRunRef.current;
    if (!last) {
      setLocked(false);
      return;
    }
    const sameLeft  = left === last.left;
    const sameRight = right === last.right;

    // If options influence the diff UI/output, consider them too:
    const sameOpts = JSON.stringify(options ?? {}) === JSON.stringify(last.options ?? {});
    setLocked(sameLeft && sameRight && sameOpts);
  }, []);

  const clearLock = useCallback(() => {
    lastRunRef.current = null;
    setLocked(false);
  }, []);

  return useMemo(() => ({
    isLocked,
    noteRun,     // call right after a successful diff run
    updateDirty, // call on any editor/options change
    clearLock,   // optional manual reset
  }), [isLocked, noteRun, updateDirty, clearLock]);
}
