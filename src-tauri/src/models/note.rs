use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Serialize, Deserialize, Clone)]
pub struct Note {
    pub id: String,
    pub title: String,             // Auto-generated title or first line if short
    pub content: String,
    pub category_path: Vec<String>, // ["Technical", "Python", "Flask"]
    pub timestamp: DateTime<Utc>,
    pub tags: Vec<String>,
    pub ai_confidence: Option<f32>, // confidence score from AI categorization
    
    // Graph positioning
    pub position: Option<GraphPosition>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct GraphPosition {
    pub x: f64,
    pub y: f64,
    pub z_index: Option<i32>,
}