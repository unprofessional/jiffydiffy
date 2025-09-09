// src/state/recent-diffs.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { DiffResult } from "../types/diff";
import { makeDiffHash } from "../utils/diff-hash";

export type RecentDiffMeta = {
  id: string;                // uuid-ish (kept for UI keys)
  hash: string;              // NEW: deterministic fingerprint of rendered diff
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
      meta?: Partial<Omit<RecentDiffMeta, "hash" | "id" | "createdAt" | "hunksCount">>;
      aText?: string;
      bText?: string;
    }
  ) => void;
  clear: () => void;
};

const MAX = 5;
const STORAGE_KEY = "diffapp:recent-diffs:v2"; // bumped for hash field

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

  const add = useCallback<Ctx["add"]>(async (entry) => {
    const { result, meta: partialMeta, aText, bText } = entry;

    // compute fingerprint of the *rendered* diff
    let hash = "";
    try {
      hash = await makeDiffHash(result);
    } catch {
      // fall back to a lossy stringify if hashing unavailable
      hash = JSON.stringify({ h: result?.hunks ?? [] }).slice(0, 256);
    }

    setItems((prev) => {
      // de-dupe by hash
      if (prev.some((it) => it.meta.hash === hash)) return prev;

      const findPreview = (txt?: string) => {
        if (txt && txt.trim()) return txt.split(/\r?\n/)[0]?.slice(0, 80);
        // try to derive a preview from diff lines (supports either .text or .s)
        // @ts-ignore
        const line = (result?.hunks ?? []).flatMap((h: any) => h.lines ?? [])
          // @ts-ignore
          .find((l: any) => (l.text ?? l.s ?? "").toString().trim());
        // @ts-ignore
        const val = (line?.text ?? line?.s ?? "") as string;
        return val ? val.slice(0, 80) : undefined;
      };

      const meta: RecentDiffMeta = {
        id: (crypto as any).randomUUID?.() || Math.random().toString(36).slice(2),
        hash,
        createdAt: Date.now(),
        hunksCount: (result?.hunks ?? []).length,
        aLabel: partialMeta?.aLabel ?? "Original",
        bLabel: partialMeta?.bLabel ?? "New",
        aPreview: partialMeta?.aPreview ?? findPreview(aText),
        bPreview: partialMeta?.bPreview ?? findPreview(bText),
      };

      return [{ meta, result, aText, bText }, ...prev].slice(0, MAX);
    });
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
