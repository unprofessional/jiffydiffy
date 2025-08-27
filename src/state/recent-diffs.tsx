import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// ✅ Use your canonical types (no local re-declare)
import type { DiffResult } from "../types/diff";

export type RecentDiffMeta = {
  id: string;                // uuid-ish
  createdAt: number;         // Date.now()
  aLabel: string;            // e.g., "Original"
  bLabel: string;            // e.g., "New"
  aPreview?: string;         // optional first line / snippet
  bPreview?: string;
  hunksCount: number;        // quick glance
};

export type RecentDiffEntry = {
  meta: RecentDiffMeta;
  result: DiffResult;
  aText?: string;
  bText?: string;
};

type Ctx = {
  items: RecentDiffEntry[];
  add: (
    entry: Omit<RecentDiffEntry, "meta"> & {
      meta?: Partial<RecentDiffMeta>;
      aText?: string;
      bText?: string;
    }
  ) => void;
  clear: () => void;
};

const MAX = 5;
const STORAGE_KEY = "diffapp:recent-diffs:v1";

const RecentDiffsContext = createContext<Ctx | null>(null);

export const RecentDiffsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<RecentDiffEntry[]>([]);

  // load on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RecentDiffEntry[];
        setItems(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      // ignore
    }
  }, []);

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const add = useCallback<Ctx["add"]>((entry) => {
    const { result, meta: partialMeta, aText, bText } = entry;

    const findPreview = (txt?: string) => {
      if (txt && txt.trim()) return txt.split(/\r?\n/)[0]?.slice(0, 80);
      const line = result.hunks.flatMap((h) => h.lines).find((l) => l.text.trim());
      return line?.text?.slice(0, 80);
    };

    const meta: RecentDiffMeta = {
      id: (crypto as any).randomUUID?.() || Math.random().toString(36).slice(2),
      createdAt: Date.now(),
      hunksCount: result.hunks.length,
      aLabel: partialMeta?.aLabel ?? "Original",
      bLabel: partialMeta?.bLabel ?? "New",
      aPreview: partialMeta?.aPreview ?? findPreview(aText),
      bPreview: partialMeta?.bPreview ?? findPreview(bText),
    };

    setItems((prev) => [{ meta, result, aText, bText }, ...prev].slice(0, MAX));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => ({ items, add, clear }), [items, add, clear]);

  return (
    <RecentDiffsContext.Provider value={value}>
      {children}
    </RecentDiffsContext.Provider>
  );
};

export function useRecentDiffs() {
  const ctx = useContext(RecentDiffsContext);
  if (!ctx) throw new Error("useRecentDiffs must be used within RecentDiffsProvider");
  return ctx;
}
