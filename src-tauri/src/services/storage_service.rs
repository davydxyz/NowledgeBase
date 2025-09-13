use std::fs;
use std::path::PathBuf;
use crate::models::{NotesDatabase, CategoriesDatabase, LinksDatabase, UIStateDatabase, UIState, GraphViewport};

pub fn get_app_data_dir() -> Result<PathBuf, String> {
    let mut path = dirs::data_dir()
        .ok_or("Failed to get app data directory")?;
    path.push("ai-helper");
    
    // Create directory if it doesn't exist
    if !path.exists() {
        fs::create_dir_all(&path)
            .map_err(|e| format!("Failed to create app directory: {}", e))?;
    }
    
    Ok(path)
}

pub fn get_notes_file_path() -> Result<PathBuf, String> {
    let mut path = get_app_data_dir()?;
    path.push("notes.json");
    Ok(path)
}

pub fn get_links_file_path() -> Result<PathBuf, String> {
    let mut file_path = get_app_data_dir()?;
    file_path.push("note_links.json");
    Ok(file_path)
}

pub fn get_categories_file_path() -> Result<PathBuf, String> {
    let mut path = get_app_data_dir()?;
    path.push("categories.json");
    Ok(path)
}

pub fn get_ui_state_file_path() -> Result<PathBuf, String> {
    let mut path = get_app_data_dir()?;
    path.push("ui_state.json");
    Ok(path)
}

pub fn load_links() -> Result<LinksDatabase, String> {
    let file_path = get_links_file_path()?;
    
    if !file_path.exists() {
        let database = LinksDatabase { links: Vec::new() };
        save_links(&database)?;
        return Ok(database);
    }
    
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read links file: {}", e))?;
    
    let database: LinksDatabase = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse links file: {}", e))?;
    
    Ok(database)
}

pub fn save_links(database: &LinksDatabase) -> Result<(), String> {
    let file_path = get_links_file_path()?;
    let content = serde_json::to_string_pretty(database)
        .map_err(|e| format!("Failed to serialize links: {}", e))?;
    
    fs::write(&file_path, content)
        .map_err(|e| format!("Failed to write links file: {}", e))
}

pub fn save_notes(database: &NotesDatabase) -> Result<(), String> {
    let file_path = get_notes_file_path()?;
    let content = serde_json::to_string_pretty(database)
        .map_err(|e| format!("Failed to serialize notes: {}", e))?;
    
    fs::write(&file_path, content)
        .map_err(|e| format!("Failed to write notes file: {}", e))
}

pub fn save_categories(database: &CategoriesDatabase) -> Result<(), String> {
    let file_path = get_categories_file_path()?;
    let content = serde_json::to_string_pretty(database)
        .map_err(|e| format!("Failed to serialize categories: {}", e))?;
    
    fs::write(&file_path, content)
        .map_err(|e| format!("Failed to write categories file: {}", e))
}

pub fn load_ui_state() -> Result<UIStateDatabase, String> {
    let file_path = get_ui_state_file_path()?;
    
    if !file_path.exists() {
        // Create default UI state
        let default_state = UIStateDatabase {
            ui_state: UIState {
                graph_viewport: GraphViewport {
                    x: 0.0,
                    y: 0.0,
                    zoom: 0.8,
                },
            },
        };
        save_ui_state(&default_state)?;
        return Ok(default_state);
    }
    
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read UI state file: {}", e))?;
    
    let database: UIStateDatabase = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse UI state file: {}", e))?;
    
    Ok(database)
}

pub fn save_ui_state(database: &UIStateDatabase) -> Result<(), String> {
    let file_path = get_ui_state_file_path()?;
    let content = serde_json::to_string_pretty(database)
        .map_err(|e| format!("Failed to serialize UI state: {}", e))?;
    
    fs::write(&file_path, content)
        .map_err(|e| format!("Failed to write UI state file: {}", e))
}