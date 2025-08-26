use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Algorithm { Myers, Patience }

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct DiffOptions {
    pub algorithm: Algorithm,
    pub ignore_case: bool,
    pub ignore_whitespace: bool,
    pub context_lines: usize,
}
impl Default for DiffOptions {
    fn default() -> Self {
        Self { algorithm: Algorithm::Patience, ignore_case: false, ignore_whitespace: false, context_lines: 3 }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FileKind {
    Text { encoding: Option<String> },
    Binary,
    Missing,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMeta {
    pub path: Option<PathBuf>,
    pub kind: FileKind,
    pub size_bytes: Option<u64>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LineOp { Equal, Insert, Delete }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Line { pub op: LineOp, pub text: String }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Hunk {
    pub a_start: usize, pub a_lines: usize,
    pub b_start: usize, pub b_lines: usize,
    pub lines: Vec<Line>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffResult {
    pub a: FileMeta,
    pub b: FileMeta,
    pub hunks: Vec<Hunk>,
}

use thiserror::Error;
#[derive(Debug, Error)]
pub enum DiffError {
    #[error("file read error: {0}")] Read(String),
}