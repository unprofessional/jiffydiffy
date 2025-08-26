export type LineOp = "equal" | "insert" | "delete";

export type Line = {
  op: LineOp;
  text: string;
};

export type Hunk = {
  a_start: number;
  a_lines: number;
  b_start: number;
  b_lines: number;
  lines: Line[];
};

export type DiffResult = {
  hunks: Hunk[];
};
