pub mod ai_service;
pub mod ai_config;
pub mod storage_service;
pub mod note_service;
pub mod category_service;
pub mod link_service;

// Re-export commonly used functions for easy importing
pub use storage_service::{save_notes, save_categories};
pub use note_service::{save_note_simplified, update_note, update_note_with_title, delete_note, get_notes, get_notes_by_category, save_note_position, get_all_note_positions};
pub use category_service::{load_categories, create_category_safe, get_category_by_id, get_category_hierarchy, validate_category_path, safe_delete_category, rebuild_hierarchy, find_category_by_name_fuzzy};
pub use link_service::{create_note_link, create_note_link_with_options, delete_note_link, get_all_note_links, get_note_links};

// UI state functions
use crate::models::{GraphViewport, UIState, UIStateDatabase};

pub async fn save_graph_viewport(x: f64, y: f64, zoom: f64) -> Result<(), String> {
    let ui_state = UIStateDatabase {
        ui_state: UIState {
            graph_viewport: GraphViewport { x, y, zoom },
        },
    };
    storage_service::save_ui_state(&ui_state)
}

pub async fn get_graph_viewport() -> Result<GraphViewport, String> {
    let ui_state_db = storage_service::load_ui_state()?;
    Ok(ui_state_db.ui_state.graph_viewport)
}