mod engine;
mod file_io;
pub mod types;

pub use types::*;

use std::path::Path;

use engine::{build_hunks, normalize};
use file_io::{load_file_text_or_binary, load_string_as_text};

pub fn diff_text(a: &str, b: &str, opts: DiffOptions) -> Result<DiffResult, DiffError> {
    let a_loaded = load_string_as_text(a);
    let b_loaded = load_string_as_text(b);
    let a_norm = normalize(a_loaded.text.as_ref().unwrap(), &opts);
    let b_norm = normalize(b_loaded.text.as_ref().unwrap(), &opts);
    let hunks = build_hunks(&a_norm, &b_norm, &opts);

    Ok(DiffResult {
        a: FileMeta { path: None, kind: a_loaded.kind, size_bytes: a_loaded.size_bytes },
        b: FileMeta { path: None, kind: b_loaded.kind, size_bytes: b_loaded.size_bytes },
        hunks,
    })
}

pub fn diff_paths(a_path: &Path, b_path: &Path, opts: DiffOptions) -> Result<DiffResult, DiffError> {
    let a_loaded = load_file_text_or_binary(a_path).map_err(|e| DiffError::Read(e.to_string()))?;
    let b_loaded = load_file_text_or_binary(b_path).map_err(|e| DiffError::Read(e.to_string()))?;

    let meta_a = FileMeta { path: Some(a_path.to_path_buf()), kind: a_loaded.kind.clone(), size_bytes: a_loaded.size_bytes };
    let meta_b = FileMeta { path: Some(b_path.to_path_buf()), kind: b_loaded.kind.clone(), size_bytes: b_loaded.size_bytes };

    match (&a_loaded.text, &b_loaded.text) {
        (Some(a_txt), Some(b_txt)) => {
            let a_norm = normalize(a_txt, &opts);
            let b_norm = normalize(b_txt, &opts);
            let hunks = build_hunks(&a_norm, &b_norm, &opts);
            Ok(DiffResult { a: meta_a, b: meta_b, hunks })
        }
        _ => Ok(DiffResult { a: meta_a, b: meta_b, hunks: Vec::new() }),
    }
}
