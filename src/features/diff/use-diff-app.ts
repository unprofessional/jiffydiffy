import { useMemo, useRef, useState } from "react";
import type { DiffResult } from "../../types/diff";
import { invokeDiff } from "../../services/diff.service";
import type { EditorApi } from "../../components/Editor";
import { useRecentDiffs } from "../../state/recent-diffs";
import { buildLineMapAtoB, invertMap } from "./line-map";

const INITIAL_LEFT = "hello\nworld\n123\nhello\nworld\n123";
const INITIAL_RIGHT = "hello\nthere\nworld\nsdsadfasdsd\nhello\nworld\n123";

export function useDiffApp() {
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
  const mapBtoA = useMemo(() => invertMap(diff, aTotal, bTotal), [diff, aTotal, bTotal]);

  async function runDiff() {
    setLoading(true);
    setError(null);
    try {
      const res = await invokeDiff(left, right, { context_lines: 2 });
      setDiff(res);
      setCurrentHunk(0);
      add({ result: res, aText: left, bText: right, meta: { aLabel: "Original", bLabel: "New" } });
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

  function openFromHistory(id: string) {
    const hit = items.find((i) => i.meta.id === id);
    if (!hit) return;
    if (typeof hit.aText === "string") setLeft(hit.aText);
    if (typeof hit.bText === "string") setRight(hit.bText);
    setDiff(hit.result);
    setCurrentHunk(0);
  }

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

  const canRunDiff = left.trim().length > 0 && right.trim().length > 0 && left !== right;

  return {
    // state
    left, right, setLeft, setRight,
    diff, loading, error, currentHunk, linkScroll, setLinkScroll,
    ghostA, setGhostA, ghostB, setGhostB,
    // refs
    leftApi, rightApi,
    // computed
    canRunDiff, mapAtoB, mapBtoA,
    // actions
    runDiff, resetAll, openFromHistory, centerOnHunk,
  };
}
