use chrono::Utc;
use uuid::Uuid;
use crate::models::{NoteLink, LinkType, LinkColor};
use crate::services::storage_service::{load_links, save_links};
use crate::services::note_service::load_notes;

pub async fn create_note_link(source_id: String, target_id: String, link_type: String, label: Option<String>) -> Result<NoteLink, String> {
    create_note_link_with_options(source_id, target_id, link_type, label, None, None).await
}

// New function with all options
pub async fn create_note_link_with_options(source_id: String, target_id: String, link_type: String, label: Option<String>, color: Option<String>, directional: Option<bool>) -> Result<NoteLink, String> {
    // Validate that both notes exist
    let notes_db = load_notes()?;
    let source_exists = notes_db.notes.iter().any(|n| n.id == source_id);
    let target_exists = notes_db.notes.iter().any(|n| n.id == target_id);
    
    if !source_exists {
        return Err(format!("Source note with id {} not found", source_id));
    }
    if !target_exists {
        return Err(format!("Target note with id {} not found", target_id));
    }
    
    // Parse link type
    let parsed_link_type = match link_type.as_str() {
        "Related" => LinkType::Related,
        "Reference" => LinkType::Reference,
        "FollowUp" => LinkType::FollowUp,
        "Contradicts" => LinkType::Contradicts,
        "Supports" => LinkType::Supports,
        _ => LinkType::Custom(link_type.clone()),
    };
    
    let mut links_db = load_links()?;
    
    // Check if same link type already exists (allow multiple different link types)
    let existing_link = links_db.links.iter().find(|link| 
        ((link.source_id == source_id && link.target_id == target_id) ||
         (link.source_id == target_id && link.target_id == source_id)) &&
        std::mem::discriminant(&link.link_type) == std::mem::discriminant(&parsed_link_type)
    );
    
    if existing_link.is_some() {
        return Err("Link of this type already exists between these notes".to_string());
    }
    
    // Parse color if provided
    let parsed_color = color.as_ref().and_then(|c| match c.as_str() {
        "purple" => Some(LinkColor::Purple),
        "yellow" => Some(LinkColor::Yellow),
        _ => None,
    });
    
    let new_link = NoteLink {
        id: Uuid::new_v4().to_string(),
        source_id,
        target_id,
        link_type: parsed_link_type,
        label,
        color: parsed_color,
        directional,
        created_at: Utc::now(),
    };
    
    links_db.links.push(new_link.clone());
    save_links(&links_db)?;
    
    Ok(new_link)
}

pub async fn delete_note_link(link_id: String) -> Result<(), String> {
    let mut links_db = load_links()?;
    
    let initial_len = links_db.links.len();
    links_db.links.retain(|link| link.id != link_id);
    
    if links_db.links.len() == initial_len {
        return Err(format!("Link with id {} not found", link_id));
    }
    
    save_links(&links_db)?;
    Ok(())
}

pub async fn get_all_note_links() -> Result<Vec<NoteLink>, String> {
    let links_db = load_links()?;
    Ok(links_db.links)
}

pub async fn get_note_links(note_id: String) -> Result<Vec<NoteLink>, String> {
    let links_db = load_links()?;
    let note_links: Vec<NoteLink> = links_db.links
        .into_iter()
        .filter(|link| link.source_id == note_id || link.target_id == note_id)
        .collect();
    Ok(note_links)
}