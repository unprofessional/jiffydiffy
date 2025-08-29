// text-utils.ts
// (BEFORE)

// ---------- Constants ----------
const DEFAULT_MAX = 120;
const ELLIPSIS = "…"; // single-character ellipsis
const IRREGULARS = new Map([
  ["person", "people"],
  ["mouse", "mice"],
  ["child", "children"],
  ["goose", "geese"],
  ["tooth", "teeth"],
]);

// Pre-compiled regexes for speed/readability
const RE_STRIP = /[^\p{Letter}\p{Number}\s_-]/gu;
const RE_DASH = /[-\s]+/g;
const RE_DUP_DASH = /-+/g;

// ---------- Public API ----------

/**
 * Convert text into a URL-safe slug.
 * Keeps ASCII/Unicode letters & numbers, underscores and dashes.
 *
 * Example:
 *   slugify("Hello, 世界!") -> "hello-世界"
 */
export function slugify(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .replace(RE_STRIP, "")
    .trim()
    .replace(RE_DASH, "-")
    .replace(RE_DUP_DASH, "-");
}

export type TruncateOptions = {
  max?: number;
  ellipsis?: string;
  /** If true, try not to cut in the middle of a word. */
  wordSafe?: boolean;
};

// NOTE: We keep it lightweight & dependency-free. For perfect grapheme handling
// consider Intl.Segmenter where available.
/**
 * Truncate a string to a max display width, appending an ellipsis.
 * Attempts to avoid cutting inside words and surrogate pairs.
 */
export function truncate(input: string | null | undefined, opts: TruncateOptions = {}): string {
  const s = input ?? "";
  const max = Math.max(0, opts.max ?? DEFAULT_MAX);
  const ellipsis = opts.ellipsis ?? ELLIPSIS;

  if (s.length <= max) return s;
  if (max <= ellipsis.length) return ellipsis.slice(0, max);

  // Try to avoid splitting surrogate pairs (emoji, etc.)
  let end = max - ellipsis.length;
  // Back up one code unit if we landed on a low surrogate
  if (end > 0 && isLowSurrogate(s.charCodeAt(end))) end -= 1;

  let head = s.slice(0, end);
  if (opts.wordSafe) {
    const lastSpace = head.lastIndexOf(" ");
    if (lastSpace > 0 && end - lastSpace < 16) head = head.slice(0, lastSpace);
  }
  return head + ellipsis;
}

/**
 * Format a count + noun with simple pluralization rules.
 *
 * Examples:
 *   formatCount(1, "person") -> "1 person"
 *   formatCount(2, "person") -> "2 people"
 *   formatCount(3, "bus") -> "3 buses"
 */
export function formatCount(count: number, noun: string): string {
  assertString(noun, "noun");
  return `${count} ${count === 1 ? noun : toPlural(noun)}`;
}

/**
 * Debounce a function call.
 * - leading: call immediately, then ignore until wait elapses
 * - trailing: call after the last invocation (default true)
 * Returns a wrapped function with .cancel() and .flush() helpers.
 */
export function debounce<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  wait: number,
  opts: { leading?: boolean; trailing?: boolean } = {},
) {
  const { leading = false, trailing = true } = opts;
  let timer: ReturnType<typeof setTimeout> | null = null;
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

    if (!timer && leading && !didLead) {
      invoke();
      didLead = true;
    }

    if (timer) clearTimeout(timer);
    if (trailing) {
      timer = setTimeout(() => {
        timer = null;
        didLead = false;
        if (trailing) invoke();
      }, wait);
    } else {
      // still reset the window if trailing disabled
      timer = setTimeout(() => {
        timer = null;
        didLead = false;
      }, wait);
    }
  } as ((...args: TArgs) => void) & { cancel(): void; flush(): void };

  wrapped.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    lastArgs = null;
    lastThis = null;
    didLead = false;
  };

  wrapped.flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      if (trailing) invoke();
      didLead = false;
    }
  };

  return wrapped;
}

// ---------- Internals ----------

function toPlural(noun: string): string {
  const lower = noun.toLowerCase();
  if (IRREGULARS.has(lower)) return IRREGULARS.get(lower)!;
  if (/[sxz]$/.test(lower) || /(ch|sh)$/.test(lower)) return noun + "es";
  if (/[aeiou]y$/.test(lower)) return noun + "s";
  if (/y$/.test(lower)) return noun.slice(0, -1) + "ies";
  return noun + "s";
}

function assertString(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}
