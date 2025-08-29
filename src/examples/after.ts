// text-utils.ts — modular, DRY helpers with small internal units
// Public API is stable: slugify, truncate, formatCount, debounce

// ---------- Constants ----------
const DEFAULT_MAX = 120;
const ELLIPSIS = "…"; // single-character ellipsis

// NOTE: irregulars kept small on purpose; callers can extend via createPluralizer
const DEFAULT_IRREGULARS = new Map<string, string>([
  ["person", "people"],
  ["mouse", "mice"],
  ["child", "children"],
  ["goose", "geese"],
  ["tooth", "teeth"],
]);

// Pre-compiled regexes
const RE_STRIP = /[^\p{Letter}\p{Number}\s_-]/gu;

// ---------- Types ----------
export type TruncateOptions = {
  max?: number;
  ellipsis?: string;
  /** If true, try not to cut in the middle of a word. */
  wordSafe?: boolean;
};

export type DebounceOptions = {
  leading?: boolean;
  trailing?: boolean;
};

export type PluralizeRule = (noun: string) => string | null;

// ---------- Public API ----------

/**
 * Convert text into a URL-safe slug (Unicode-aware).
 */
export function slugify(input: string | null | undefined): string {
  const s = toString(input);
  if (s.length === 0) return "";
  return chain(
    s.toLowerCase(),
    stripUnsafeSlugChars,
    trimWhitespace,
    spacesToDash,
    collapseDashes,
  );
}

/**
 * Truncate a string with optional word-safe behavior and custom ellipsis.
 * Uses a tiny segmentation adapter (Intl.Segmenter if available).
 */
export function truncate(input: string | null | undefined, opts: TruncateOptions = {}): string {
  const s = toString(input);
  const max = clampNonNegative(opts.max ?? DEFAULT_MAX);
  const ellipsis = opts.ellipsis ?? ELLIPSIS;

  if (s.length <= max) return s;
  if (max <= ellipsis.length) return ellipsis.slice(0, max);

  const seg = getSegmenter();
  const sliceLen = max - ellipsis.length;

  // Use grapheme segmentation when available, else fall back to code-unit slice
  let head = seg
    ? sliceByGraphemes(s, sliceLen, seg)
    : safeSliceCodeUnits(s, sliceLen);

  if (opts.wordSafe) {
    head = backtrackToWordBoundary(head);
  }

  return head + ellipsis;
}

/**
 * Format a count + noun with pluggable pluralization strategy.
 * Keep default behavior but allow extension via createPluralizer().
 */
export function formatCount(count: number, noun: string): string {
  // assertNonEmptyString(noun, "noun");
  const pluralizer = defaultPluralizer;
  return `${count} ${count === 1 ? noun : pluralizer.toPlural(noun)}`;
}

/**
 * Debounce a function with leading/trailing options and cancel/flush helpers.
 */
export function debounce<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  wait: number,
  opts: DebounceOptions = {},
) {
  const { leading = false, trailing = true } = opts;
  const timer = makeTimer();
  let lastArgs: TArgs | null = null;
  let lastThis: unknown = null;
  let didLead = false;

  const invoke = () => {
    if (!lastArgs) return;
    fn.apply(lastThis as any, lastArgs);
    lastArgs = null;
    lastThis = null;
  };

  const wrapped = function (this: unknown, ...args: TArgs) {
    lastArgs = args;
    lastThis = this;

    if (!timer.active() && leading && !didLead) {
      invoke();
      didLead = true;
    }

    timer.set(() => {
      didLead = false;
      if (trailing) invoke();
    }, wait);
  } as ((...args: TArgs) => void) & { cancel(): void; flush(): void };

  wrapped.cancel = () => {
    timer.clear();
    didLead = false;
    lastArgs = null;
    lastThis = null;
  };

  wrapped.flush = () => {
    if (timer.active()) {
      timer.clear();
      didLead = false;
      if (trailing) invoke();
    }
  };

  return wrapped;
}

// ---------- Extension Points (exported) ----------

/**
 * Create a custom pluralizer by supplying irregulars and rule order.
 * Rules are tried in sequence; first non-null return wins.
 */
export function createPluralizer(
  irregulars: Map<string, string> = DEFAULT_IRREGULARS,
  rules: PluralizeRule[] = DEFAULT_RULES,
) {
  return {
    toPlural(noun: string): string {
      const lower = noun.toLowerCase();
      const irr = irregulars.get(lower);
      if (irr) return matchCase(noun, irr);

      for (const rule of rules) {
        const res = rule(noun);
        if (res) return res;
      }
      return noun + "s";
    },
  };
}

// Export a shared default instance (used by formatCount)
export const defaultPluralizer = createPluralizer();

// ---------- Internals: Slug ----------

function stripUnsafeSlugChars(s: string) {
  return s.replace(RE_STRIP, "");
}

function trimWhitespace(s: string) {
  return s.trim();
}

function spacesToDash(s: string) {
  // Treat any run of spaces or dashes as a dash
  return s.replace(/[-\s]+/g, "-");
}

function collapseDashes(s: string) {
  return s.replace(/-+/g, "-");
}

// ---------- Internals: Truncate ----------

type Segmenter = {
  segment(input: string): Iterable<{ segment: string }>;
};

function getSegmenter(): Segmenter | null {
  // Use Intl.Segmenter if present; fallback otherwise
  const AnyIntl = (globalThis as any).Intl;
  if (AnyIntl && typeof AnyIntl.Segmenter === "function") {
    try {
      const seg = new AnyIntl.Segmenter(undefined, { granularity: "grapheme" });
      // Coerce to a minimal type to avoid TS lib dependency
      return {
        segment(input: string) {
          return seg.segment(input) as Iterable<{ segment: string }>;
        },
      };
    } catch {
      // ignore
    }
  }
  return null;
}

function sliceByGraphemes(input: string, take: number, seg: Segmenter): string {
  if (take <= 0) return "";
  let out = "";
  let count = 0;
  for (const part of seg.segment(input)) {
    if (count >= take) break;
    out += part.segment;
    count += 1;
  }
  return out;
}

function safeSliceCodeUnits(s: string, take: number): string {
  // avoid ending on a low surrogate
  let end = Math.max(0, take);
  if (end > 0 && isLowSurrogate(s.charCodeAt(end))) end -= 1;
  return s.slice(0, end);
}

function backtrackToWordBoundary(s: string): string {
  const i = s.lastIndexOf(" ");
  // Only backtrack a small amount; keep short words intact
  if (i > -1 && s.length - i < 16) return s.slice(0, i);
  return s;
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}

// ---------- Internals: Pluralization ----------

const DEFAULT_RULES: PluralizeRule[] = [
  // e.g., bus -> buses, box -> boxes, match -> matches
  (noun) => (/[sxz]$/i.test(noun) || /(ch|sh)$/i.test(noun) ? noun + "es" : null),
  // toy -> toys, key -> keys
  (noun) => (/[aeiou]y$/i.test(noun) ? noun + "s" : null),
  // city -> cities
  (noun) => (/y$/i.test(noun) ? noun.slice(0, -1) + "ies" : null),
];

function matchCase(template: string, value: string) {
  // Preserve capitalization style from the template noun
  if (template === template.toUpperCase()) return value.toUpperCase();
  if (template[0] === template[0]?.toUpperCase()) {
    return value[0].toUpperCase() + value.slice(1);
  }
  return value;
}

// ---------- Internals: Debounce ----------

function makeTimer() {
  let id: ReturnType<typeof setTimeout> | null = null;
  return {
    set(cb: () => void, ms: number) {
      if (id) clearTimeout(id);
      id = setTimeout(() => {
        id = null;
        cb();
      }, ms);
    },
    clear() {
      if (id) {
        clearTimeout(id);
        id = null;
      }
    },
    active() {
      return id !== null;
    },
  };
}

// ---------- Internals: Shared utils ----------

function toString(v: unknown): string {
  return v == null ? "" : String(v);
}

function clampNonNegative(n: number): number {
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function chain(s: string, ...fns: Array<(s: string) => string>): string {
  let out = s;
  for (const fn of fns) out = fn(out);
  return out;
}

// ---------- Tiny self-test (dev only) ----------
/* istanbul ignore next */
// function selfTest() {
//   console.assert(slugify("Hello, 世界!") === "hello-世界", "slugify unicode failed");
//   console.assert(truncate("abcdef", { max: 3 }) === "…", "truncate tiny max");
//   console.assert(formatCount(2, "person") === "2 people", "irregular plural");
// }
// if (process.env.NODE_ENV !== "production") {
//   try { selfTest(); } catch { /* noop */ }
// }
