#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod models;
mod services;

use tauri::{Manager, menu::{Menu, MenuItem}, tray::{TrayIconBuilder, TrayIconEvent}};
use tauri_plugin_global_shortcut::GlobalShortcutExt;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

// Import our models
use models::{Note, Category, NoteLink, GraphPosition, GraphViewport};

// Tauri Commands - Simplified wrappers around services
#[tauri::command]
async fn ask_ai(question: String, response_type: Option<String>) -> Result<String, String> {
    services::ai_service::ask_ai(question, response_type).await
}

#[tauri::command]
async fn save_note(content: String, category_path: Option<Vec<String>>, custom_title: Option<String>) -> Result<Note, String> {
    services::save_note_simplified(content, category_path, custom_title).await
}

#[tauri::command]
async fn update_note(id: String, content: String) -> Result<Note, String> {
    services::update_note(id, content).await
}

#[tauri::command]
async fn update_note_with_title(id: String, content: String, title: Option<String>) -> Result<Note, String> {
    services::update_note_with_title(id, content, title).await
}

#[tauri::command]
async fn get_notes() -> Result<Vec<Note>, String> {
    services::get_notes().await
}

#[tauri::command]
async fn delete_note(id: String) -> Result<(), String> {
    services::delete_note(id).await
}

#[tauri::command]
async fn get_categories() -> Result<Vec<Category>, String> {
    let database = services::load_categories()?;
    Ok(database.categories)
}

#[tauri::command]
async fn create_category(name: String, parent_path: Option<Vec<String>>) -> Result<Category, String> {
    services::create_category_safe(name, parent_path)
}

#[tauri::command]
async fn rename_category(category_id: String, new_name: String) -> Result<(), String> {
    services::category_service::rename_category(category_id, new_name)
}

#[tauri::command]
async fn delete_category(category_id: String) -> Result<(), String> {
    services::safe_delete_category(&category_id)
}

#[tauri::command]
async fn get_notes_by_category(category_path: Vec<String>) -> Result<Vec<Note>, String> {
    services::get_notes_by_category(category_path).await
}

#[tauri::command]
async fn get_category_by_id_cmd(category_id: String) -> Result<Option<Category>, String> {
    services::get_category_by_id(&category_id)
}

#[tauri::command]
async fn get_category_hierarchy_cmd() -> Result<Vec<Category>, String> {
    services::get_category_hierarchy()
}

#[tauri::command]
async fn validate_category_path_cmd(path: Vec<String>) -> Result<bool, String> {
    services::validate_category_path(&path)
}

#[tauri::command]
async fn find_categories_fuzzy(search_name: String) -> Result<Vec<Category>, String> {
    services::find_category_by_name_fuzzy(&search_name)
}

#[tauri::command]
async fn rebuild_hierarchy_cmd() -> Result<(), String> {
    services::rebuild_hierarchy()
}

#[tauri::command]
async fn save_note_position(note_id: String, x: f64, y: f64) -> Result<(), String> {
    services::save_note_position(note_id, x, y).await
}

#[tauri::command]
async fn get_all_note_positions() -> Result<Vec<(String, GraphPosition)>, String> {
    services::get_all_note_positions().await
}

#[tauri::command]
async fn create_note_link(source_id: String, target_id: String, link_type: String, label: Option<String>) -> Result<NoteLink, String> {
    services::create_note_link(source_id, target_id, link_type, label).await
}

#[tauri::command]
async fn create_note_link_with_options(source_id: String, target_id: String, link_type: String, label: Option<String>, color: Option<String>, directional: Option<bool>) -> Result<NoteLink, String> {
    services::create_note_link_with_options(source_id, target_id, link_type, label, color, directional).await
}

#[tauri::command]
async fn delete_note_link(link_id: String) -> Result<(), String> {
    services::delete_note_link(link_id).await
}

#[tauri::command]
async fn get_all_note_links() -> Result<Vec<NoteLink>, String> {
    services::get_all_note_links().await
}

#[tauri::command]
async fn get_note_links(note_id: String) -> Result<Vec<NoteLink>, String> {
    services::get_note_links(note_id).await
}

#[tauri::command]
async fn save_graph_viewport(x: f64, y: f64, zoom: f64) -> Result<(), String> {
    services::save_graph_viewport(x, y, zoom).await
}

#[tauri::command]
async fn get_graph_viewport() -> Result<GraphViewport, String> {
    services::get_graph_viewport().await
}

fn toggle_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        match window.is_visible() {
            Ok(visible) => {
                if visible {
                    let _ = window.hide();
                } else {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            Err(_) => {
                // If we can't check visibility, just try to show
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    }
}

fn main() {
    // Load environment variables from .env file
    dotenv::dotenv().ok();
    
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler({
                    let last_trigger = Arc::new(Mutex::new(Instant::now()));
                    move |app, _shortcut, _event| {
                        let mut last = last_trigger.lock().unwrap();
                        let now = Instant::now();
                        if now.duration_since(*last) > Duration::from_millis(100) {
                            *last = now;
                            toggle_window(app);
                        }
                    }
                })
                .build()
        )
        .invoke_handler(tauri::generate_handler![
            ask_ai, 
            save_note, 
            update_note,
            update_note_with_title,
            get_notes, 
            delete_note,
            get_categories,
            create_category,
            rename_category,
            delete_category,
            get_notes_by_category,
            get_category_by_id_cmd,
            get_category_hierarchy_cmd,
            validate_category_path_cmd,
            find_categories_fuzzy,
            rebuild_hierarchy_cmd,
            save_note_position,
            get_all_note_positions,
            create_note_link,
            create_note_link_with_options,
            delete_note_link,
            get_all_note_links,
            get_note_links,
            save_graph_viewport,
            get_graph_viewport
        ])
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show AI Helper", true, None::<&str>)?;
            let hide_i = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &hide_i, &quit_i])?;

            let _tray = TrayIconBuilder::with_id("tray")
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .build(app)?;
            
            // Register global shortcut: Cmd+Option+N (Mac) / Ctrl+Alt+N (Windows/Linux)
            app.global_shortcut().register("CmdOrCtrl+Alt+N")?;
            
            Ok(())
        })
        .on_tray_icon_event(|app, event| match event {
            TrayIconEvent::Click { .. } => {
                toggle_window(app);
            }
            TrayIconEvent::Enter { .. } => {}
            TrayIconEvent::Leave { .. } => {}
            _ => {}
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            "quit" => {
                std::process::exit(0);
            }
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            _ => {}
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                window.hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}