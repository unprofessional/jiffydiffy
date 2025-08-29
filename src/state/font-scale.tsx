import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type FontSize = "S" | "M" | "L";

const STORAGE_KEY = "ui.fontSize";
const DEFAULT: FontSize = "M";

const SCALE = {
  S: { uiPx: 13, codePx: 12, codeLh: 1.5 },
  M: { uiPx: 14, codePx: 13, codeLh: 1.55 },
  L: { uiPx: 16, codePx: 15, codeLh: 1.6 },
} as const;

type Ctx = {
  size: FontSize;
  setSize: (s: FontSize) => void;
  vars: React.CSSProperties; // CSS variables to inject
  grow: () => void;
  shrink: () => void;
  reset: () => void;
};

const FontScaleCtx = createContext<Ctx | null>(null);

export const FontScaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [size, setSizeState] = useState<FontSize>(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as FontSize | null) || DEFAULT;
    return ["S", "M", "L"].includes(saved ?? "") ? saved! : DEFAULT;
  });

  const setSize = (s: FontSize) => {
    setSizeState(s);
    localStorage.setItem(STORAGE_KEY, s);
  };

  const grow = () => setSize(size === "S" ? "M" : size === "M" ? "L" : "L");
  const shrink = () => setSize(size === "L" ? "M" : size === "M" ? "S" : "S");
  const reset = () => setSize(DEFAULT);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === "=" || e.key === "+") { e.preventDefault(); grow(); }
      else if (e.key === "-") { e.preventDefault(); shrink(); }
      else if (e.key === "0") { e.preventDefault(); reset(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [size]);

  const vars = useMemo<React.CSSProperties>(() => {
    const s = SCALE[size];
    return {
      // UI text (labels, badges, etc.)
      ["--ui-font" as any]: `${s.uiPx}px`,
      // Code/editors/diff panes
      ["--code-font" as any]: `${s.codePx}px`,
      ["--code-line-height" as any]: String(s.codeLh),
    };
  }, [size]);

  const value = useMemo(() => ({ size, setSize, vars, grow, shrink, reset }), [size, vars]);

  return <FontScaleCtx.Provider value={value}>{children}</FontScaleCtx.Provider>;
};

export function useFontScale() {
  const ctx = useContext(FontScaleCtx);
  if (!ctx) throw new Error("useFontScale must be used inside <FontScaleProvider>");
  return ctx;
}
