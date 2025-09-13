use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

fn default_created_at() -> DateTime<Utc> {
    Utc::now()
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Category {
    pub id: String,           // UUID for unique identification
    pub name: String,         // Display name
    pub parent_id: Option<String>, // Proper parent reference
    #[serde(default)]
    pub full_path: String,    // Cached full path for display (e.g., "Technical → Python → Flask")
    pub path: Vec<String>,    // Path array for compatibility (["Technical", "Python", "Flask"])
    #[serde(default)]
    pub level: u32,          // Hierarchy depth (0 = root, 1 = child, etc.)
    pub note_count: u32,     // Cached count of notes in this category
    #[serde(default = "default_created_at")]
    pub created_at: DateTime<Utc>, // When category was created
    pub color: Option<String>, // Optional color for UI
}

