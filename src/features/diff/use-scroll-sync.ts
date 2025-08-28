import { useMemo, useRef } from "react";
import type { EditorApi } from "../../components/Editor";

export function useScrollSync(
  opts: {
    linkScroll: boolean;
    mapAtoB: (i: number) => number;
    mapBtoA: (i: number) => number;
    leftApi: React.MutableRefObject<EditorApi | null>;
    rightApi: React.MutableRefObject<EditorApi | null>;
  }
) {
  const { linkScroll, mapAtoB, mapBtoA, leftApi, rightApi } = opts;
  const reentrant = useRef(false);

  const handlers = useMemo(() => ({
    left(info: { topLine: number }) {
      if (!linkScroll || reentrant.current) return;
      reentrant.current = true;
      rightApi.current?.scrollToLine(mapAtoB(info.topLine), "top");
      reentrant.current = false;
    },
    right(info: { topLine: number }) {
      if (!linkScroll || reentrant.current) return;
      reentrant.current = true;
      leftApi.current?.scrollToLine(mapBtoA(info.topLine), "top");
      reentrant.current = false;
    },
  }), [linkScroll, mapAtoB, mapBtoA, leftApi, rightApi]);

  return handlers;
}
