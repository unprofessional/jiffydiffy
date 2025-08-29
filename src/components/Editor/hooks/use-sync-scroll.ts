import { useEffect, type RefObject, type MutableRefObject } from "react";

type RefLike<T extends HTMLElement> = RefObject<T | null> | MutableRefObject<T | null>;

export function useSyncScroll({
  taRef,
  gutRef,
  rulerRef,
  ghostRef,
}: {
  taRef: RefLike<HTMLTextAreaElement>;
  gutRef: RefLike<HTMLDivElement>;
  rulerRef: RefLike<HTMLDivElement>;
  ghostRef?: RefLike<HTMLDivElement>;
}) {
  useEffect(() => {
    const ta = taRef.current;
    const g = gutRef.current;
    const r = rulerRef.current;
    const gh = ghostRef?.current;

    if (!ta || !g || !r) return;

    const applyTransforms = () => {
      g.scrollTop = ta.scrollTop;
      r.scrollTop = ta.scrollTop;
      g.scrollLeft = ta.scrollLeft;
      r.scrollLeft = ta.scrollLeft;
      if (gh) gh.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
    };

    const onScroll = () => applyTransforms();
    applyTransforms();

    ta.addEventListener("scroll", onScroll, { passive: true });
    return () => ta.removeEventListener("scroll", onScroll);
  }, [taRef, gutRef, rulerRef, ghostRef]);
}
