use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Serialize, Deserialize, Clone)]
pub struct NoteLink {
    pub id: String,
    pub source_id: String,
    pub target_id: String,
    pub link_type: LinkType,
    pub label: Option<String>,
    pub color: Option<LinkColor>,
    pub directional: Option<bool>,
    pub created_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Clone)]
pub enum LinkType {
    Related,
    Reference,
    FollowUp,
    Contradicts,
    Supports,
    Custom(String),
}

#[derive(Serialize, Deserialize, Clone)]
pub enum LinkColor {
    Purple,
    Yellow,
}