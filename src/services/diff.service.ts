import { invoke } from "@tauri-apps/api/core";
import type { DiffResult } from "../types/diff";

type DiffOptions = {
  algorithm: "patience" | "myers" | "histogram";
  ignore_case: boolean;
  ignore_whitespace: boolean;
  context_lines: number;
};

const DEFAULT_OPTS: DiffOptions = {
  algorithm: "patience",
  ignore_case: false,
  ignore_whitespace: false,
  context_lines: 2,
};

export async function invokeDiff(a: string, b: string, opts: Partial<DiffOptions> = {}): Promise<DiffResult> {
  const options = { ...DEFAULT_OPTS, ...opts };
  return await invoke<DiffResult>("cmd_diff_text", { args: { a, b, options } });
}
