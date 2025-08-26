// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod diff;       // <- local module (src-tauri/src/diff/)
mod commands;   // <- local module (src-tauri/src/commands.rs)

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      commands::cmd_diff_text,
      commands::cmd_diff_paths,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
