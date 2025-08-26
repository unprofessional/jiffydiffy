import { useEffect, useRef } from "react";

export function Editor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const gutRef = useRef<HTMLDivElement | null>(null);

  // keep gutters lined up while typing/scrolling
  useEffect(() => {
    const ta = taRef.current, g = gutRef.current;
    if (!ta || !g) return;
    const onScroll = () => { g.scrollTop = ta.scrollTop; };
    ta.addEventListener("scroll", onScroll);
    return () => ta.removeEventListener("scroll", onScroll);
  }, []);

  const lines = value.split("\n").length || 1;
  const nums = Array.from({ length: lines }, (_, i) => i + 1);

  return (
    <div className="editor">
      <div className="editor-header">{label}</div>
      <div className="editor-body">
        <div className="ln-gutter" ref={gutRef}>
          {nums.map(n => <div key={n} className="ln">{n}</div>)}
        </div>
        <textarea
          ref={taRef}
          className="ln-textarea"
          value={value}
          onChange={e => onChange(e.target.value)}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
