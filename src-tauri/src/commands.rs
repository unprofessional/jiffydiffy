use serde::Deserialize;
use std::path::PathBuf;

use crate::diff::{self, DiffOptions, DiffResult};

#[derive(Deserialize)]
pub struct DiffTextArgs {
    pub a: String,
    pub b: String,
    pub options: Option<DiffOptions>,
}

#[tauri::command]
pub fn cmd_diff_text(args: DiffTextArgs) -> Result<DiffResult, String> {
    let opts = args.options.unwrap_or_default();
    diff::diff_text(&args.a, &args.b, opts).map_err(|e| e.to_string())
}

#[derive(Deserialize)]
pub struct DiffPathsArgs {
    pub a_path: PathBuf,
    pub b_path: PathBuf,
    pub options: Option<DiffOptions>,
}

#[tauri::command]
pub fn cmd_diff_paths(args: DiffPathsArgs) -> Result<DiffResult, String> {
    let opts = args.options.unwrap_or_default();
    diff::diff_paths(&args.a_path, &args.b_path, opts).map_err(|e| e.to_string())
}
