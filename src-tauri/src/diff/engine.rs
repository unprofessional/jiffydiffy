use super::types::{Algorithm, DiffOptions, Hunk, Line, LineOp};
use similar::{Algorithm as SimilarAlgo, ChangeTag, TextDiff};

/// Normalize text according to options (case/whitespace)
pub(crate) fn normalize(s: &str, opts: &DiffOptions) -> String {
    let mut out = if opts.ignore_case { s.to_ascii_lowercase() } else { s.to_string() };

    if opts.ignore_whitespace {
        let mut collapsed = String::with_capacity(out.len());
        let mut last_ws = false;
        for ch in out.chars() {
            if ch.is_whitespace() {
                if !last_ws {
                    collapsed.push(' ');
                    last_ws = true;
                }
            } else {
                collapsed.push(ch);
                last_ws = false;
            }
        }
        out = collapsed.trim().to_string();
    }

    out
}

fn algo(opts: &DiffOptions) -> SimilarAlgo {
    match opts.algorithm {
        Algorithm::Myers => SimilarAlgo::Myers,
        Algorithm::Patience => SimilarAlgo::Patience,
    }
}

pub(crate) fn build_hunks(a: &str, b: &str, opts: &DiffOptions) -> Vec<Hunk> {
    let diff = TextDiff::configure()
        .algorithm(algo(opts))
        .timeout(std::time::Duration::from_millis(1500))
        .diff_lines(a, b);

    let mut hunks = Vec::new();

    for group in diff.grouped_ops(opts.context_lines) {
        let (mut a_start, mut b_start) = (usize::MAX, usize::MAX);
        let (mut a_lines, mut b_lines) = (0usize, 0usize);
        let mut lines = Vec::<Line>::new();

        for op in group {
            // iter_changes expects a reference
            for change in diff.iter_changes(&op) {
                let tag = change.tag();
                let text_raw = change.to_string();
                // strip trailing newline; renderer decides how to show EOLs
                let text = text_raw.strip_suffix('\n').unwrap_or(&text_raw).to_string();

                let op = match tag {
                    ChangeTag::Equal  => LineOp::Equal,
                    ChangeTag::Insert => LineOp::Insert,
                    ChangeTag::Delete => LineOp::Delete,
                };

                match tag {
                    ChangeTag::Equal  => { a_lines += 1; b_lines += 1; }
                    ChangeTag::Insert => { b_lines += 1; }
                    ChangeTag::Delete => { a_lines += 1; }
                }

                if a_start == usize::MAX {
                    a_start = change.old_index().map(|i| i + 1).unwrap_or(1);
                }
                if b_start == usize::MAX {
                    b_start = change.new_index().map(|i| i + 1).unwrap_or(1);
                }

                lines.push(Line { op, text });
            }
        }

        hunks.push(Hunk { a_start, a_lines, b_start, b_lines, lines });
    }

    hunks
}
