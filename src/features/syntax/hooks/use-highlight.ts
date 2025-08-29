// src/features/syntax/hooks/use-highlight.ts
import { useMemo } from "react";
import { hljs } from "../highlight";

// fast escape for fallback
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function useHighlight(value: string, lang: "auto" | string = "auto") {
  return useMemo(() => {
    // Short-circuit empty
    if (!value) return { language: lang === "auto" ? "plaintext" : lang, linesHtml: [""] };

    // Try detect or explicit language
    let res:
      | { value: string; language?: string }
      | null = null;

    try {
      res =
        lang === "auto"
          ? hljs.highlightAuto(value)
          : hljs.highlight(value, { language: lang, ignoreIllegals: true });
    } catch {
      // fall through to plain
    }

    const html = res?.value ?? esc(value);
    // Split into lines after highlighting. Replace empty with &nbsp; so heights match.
    const linesHtml = html.split("\n").map(l => (l.length ? l : "&nbsp;"));
    const language = (res?.language ?? (lang === "auto" ? "plaintext" : lang)) as string;

    return { language, linesHtml };
  }, [value, lang]);
}
