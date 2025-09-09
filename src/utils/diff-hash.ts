// src/utils/diff-hash.ts
// Stable hashing for diff results using Web Crypto (with a small fallback)
// The output is a lowercase hex SHA-256.

function toHex(buf: ArrayBuffer): string {
  const v = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < v.length; i++) {
    const h = v[i].toString(16).padStart(2, "0");
    out += h;
  }
  return out;
}

/** Stable, minimal serialization of the diff result & options. */
function stableSerialize(diff: any, options?: Record<string, unknown>): string {
  // Only include fields that affect the *rendered* output
  const safeOpts = options ? canonicalize(options) : {};
  const payload: any = {
    o: safeOpts,
    h: Array.isArray(diff?.hunks)
      ? diff.hunks.map((h: any) => ({
          a: [h.a_start, h.a_lines],
          b: [h.b_start, h.b_lines],
          // compress each line to [type, text]
          l: Array.isArray(h.lines)
            ? h.lines.map((ln: any) => [ln.t, ln.s])
            : [],
        }))
      : [],
  };
  return JSON.stringify(payload);
}

/** Canonicalize plain objects: sort keys deeply */
function canonicalize(v: any): any {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(canonicalize);
  const out: Record<string, any> = {};
  Object.keys(v).sort().forEach(k => {
    out[k] = canonicalize(v[k]);
  });
  return out;
}

async function sha256(message: string): Promise<string> {
  if (crypto?.subtle?.digest) {
    const data = new TextEncoder().encode(message);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return toHex(digest);
  }
  // Tiny fallback (rare in modern WebViews); not constant-time—OK for fingerprinting.
  // Simple JS implementation using built-in `crypto` is not available in browser,
  // so inject a tiny WASM/JS lib if you need older platforms. For now, throw:
  throw new Error("Web Crypto API not available for hashing");
}

/** Public API: produce a stable fingerprint for this diff output. */
export async function makeDiffHash(diff: any, options?: Record<string, unknown>): Promise<string> {
  const serialized = stableSerialize(diff, options);
  return sha256(serialized);
}
