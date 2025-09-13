use chrono::Utc;
use uuid::Uuid;
use std::fs;
use crate::models::{Note, NotesDatabase, GraphPosition};
use crate::services::storage_service::{get_notes_file_path, save_notes};
use crate::services::category_service::{validate_category_path, create_category_safe, update_category_note_counts};
use crate::services::ai_service::{generate_ai_title, generate_simple_title};

pub fn load_notes() -> Result<NotesDatabase, String> {
    let file_path = get_notes_file_path()?;
    
    if !file_path.exists() {
        return Ok(NotesDatabase { notes: Vec::new() });
    }
    
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read notes file: {}", e))?;
    
    // Try to parse with new format first
    match serde_json::from_str::<NotesDatabase>(&content) {
        Ok(database) => {
            // Check if any notes are missing titles and migrate them
            let mut needs_migration = false;
            let migrated_notes: Vec<Note> = database.notes.into_iter().map(|mut note| {
                if note.title.is_empty() {
                    note.title = generate_simple_title(&note.content);
                    needs_migration = true;
                }
                note
            }).collect();
            
            let final_database = NotesDatabase { notes: migrated_notes };
            
            if needs_migration {
                save_notes(&final_database)?;
            }
            
            Ok(final_database)
        },
        Err(_) => {
            // Try to parse with old format for migration
            #[derive(serde::Deserialize)]
            struct OldNote {
                id: String,
                content: String,
                category: String,
                timestamp: chrono::DateTime<Utc>,
                tags: Vec<String>,
            }
            
            #[derive(serde::Deserialize)]
            struct OldNoteWithPath {
                id: String,
                content: String,
                category_path: Vec<String>,
                timestamp: chrono::DateTime<Utc>,
                tags: Vec<String>,
                ai_confidence: Option<f32>,
            }
            
            #[derive(serde::Deserialize)]
            struct OldNotesDatabase {
                notes: Vec<OldNote>,
            }
            
            // Try to parse notes with category_path but no title
            match serde_json::from_str::<serde_json::Value>(&content) {
                Ok(json_value) => {
                    if let Some(notes_array) = json_value.get("notes").and_then(|n| n.as_array()) {
                        let mut migrated_notes = Vec::new();
                        
                        for note_value in notes_array {
                            if let Ok(old_note_with_path) = serde_json::from_value::<OldNoteWithPath>(note_value.clone()) {
                                // Migrate note with category_path but no title
                                migrated_notes.push(Note {
                                    id: old_note_with_path.id,
                                    title: generate_simple_title(&old_note_with_path.content),
                                    content: old_note_with_path.content,
                                    category_path: old_note_with_path.category_path,
                                    timestamp: old_note_with_path.timestamp,
                                    tags: old_note_with_path.tags,
                                    ai_confidence: old_note_with_path.ai_confidence,
                                    position: None,
                                });
                            } else if let Ok(old_note) = serde_json::from_value::<OldNote>(note_value.clone()) {
                                // Migrate very old note format
                                migrated_notes.push(Note {
                                    id: old_note.id,
                                    title: generate_simple_title(&old_note.content),
                                    content: old_note.content,
                                    category_path: vec![old_note.category],
                                    timestamp: old_note.timestamp,
                                    tags: old_note.tags,
                                    ai_confidence: None,
                                    position: None,
                                });
                            }
                        }
                        
                        let new_database = NotesDatabase { notes: migrated_notes };
                        save_notes(&new_database)?;
                        return Ok(new_database);
                    }
                }
                Err(_) => {}
            }
            
            // Final attempt with old format
            match serde_json::from_str::<OldNotesDatabase>(&content) {
                Ok(old_database) => {
                    // Migrate old notes to new format
                    let new_notes: Vec<Note> = old_database.notes.into_iter().map(|old_note| {
                        Note {
                            id: old_note.id,
                            title: generate_simple_title(&old_note.content),
                            content: old_note.content,
                            category_path: vec![old_note.category], // Convert single category to path
                            timestamp: old_note.timestamp,
                            tags: old_note.tags,
                            ai_confidence: None,
                            position: None,
                        }
                    }).collect();
                    
                    let new_database = NotesDatabase { notes: new_notes };
                    
                    // Save migrated data
                    save_notes(&new_database)?;
                    
                    Ok(new_database)
                },
                Err(e) => Err(format!("Failed to parse notes file (old or new format): {}", e))
            }
        }
    }
}

/// Save a note with simplified categorization (user chooses category, no slow AI calls)
pub async fn save_note_simplified(content: String, category_path: Option<Vec<String>>, custom_title: Option<String>) -> Result<Note, String> {
    let mut database = load_notes()?;
    
    // Use provided category path or default to "General"
    let final_category_path = if let Some(path) = category_path {
        // Check if provided path exists, if not create it
        if !validate_category_path(&path)? {
            // Create the category path step by step
            let mut current_path = Vec::new();
            for segment in &path {
                current_path.push(segment.clone());
                
                // Check if this level exists
                if !validate_category_path(&current_path)? {
                    // Create this level
                    let parent_path = if current_path.len() > 1 {
                        Some(current_path[..current_path.len() - 1].to_vec())
                    } else {
                        None
                    };
                    create_category_safe(segment.clone(), parent_path)?;
                }
            }
        }
        path
    } else {
        // Default to "General" category
        vec!["General".to_string()]
    };
    
    // Generate title for the note - use custom title if provided and not empty, otherwise generate
    let title = if let Some(custom) = custom_title {
        let trimmed_custom = custom.trim();
        if !trimmed_custom.is_empty() {
            // Use user-provided title if available and not empty
            trimmed_custom.to_string()
        } else {
            // Custom title was empty, generate default from content
            generate_simple_title(&content)
        }
    } else if content.len() > 20 {
        // Use AI title generation for any substantial content
        generate_ai_title(&content).await
            .unwrap_or_else(|_| generate_simple_title(&content))
    } else {
        // For very short content, just use it as-is
        content.trim().to_string()
    };

    let note = Note {
        id: Uuid::new_v4().to_string(),
        title,
        content,
        category_path: final_category_path,
        timestamp: Utc::now(),
        tags: Vec::new(), // No automatic tag extraction - user can add manually if needed
        ai_confidence: None,
        position: None,
    };
    
    database.notes.push(note.clone());
    save_notes(&database)?;
    
    // Update category note counts
    update_category_note_counts()?;
    
    Ok(note)
}

pub async fn update_note(id: String, content: String) -> Result<Note, String> {
    let mut database = load_notes()?;
    
    let note_index = database.notes.iter()
        .position(|note| note.id == id)
        .ok_or("Note not found")?;
    
    database.notes[note_index].content = content.clone();
    
    // Regenerate title if content changed significantly
    let new_title = if content.len() > 20 {
        // Use AI title generation for any substantial content
        generate_ai_title(&content).await
            .unwrap_or_else(|_| generate_simple_title(&content))
    } else {
        // For very short content, just use it as-is
        content.trim().to_string()
    };
    
    database.notes[note_index].title = new_title;
    
    save_notes(&database)?;
    update_category_note_counts()?;
    
    Ok(database.notes[note_index].clone())
}

pub async fn update_note_with_title(id: String, content: String, title: Option<String>) -> Result<Note, String> {
    let mut database = load_notes()?;
    
    let note_index = database.notes.iter()
        .position(|note| note.id == id)
        .ok_or("Note not found")?;
    
    database.notes[note_index].content = content.clone();
    
    // Use provided title or regenerate if not provided
    let new_title = if let Some(custom_title) = title {
        if !custom_title.trim().is_empty() {
            custom_title.trim().to_string()
        } else {
            // If empty title provided, regenerate from content
            if content.len() > 20 {
                generate_ai_title(&content).await
                    .unwrap_or_else(|_| generate_simple_title(&content))
            } else {
                content.trim().to_string()
            }
        }
    } else {
        // No title provided, regenerate from content
        if content.len() > 20 {
            generate_ai_title(&content).await
                .unwrap_or_else(|_| generate_simple_title(&content))
        } else {
            content.trim().to_string()
        }
    };
    
    database.notes[note_index].title = new_title;
    
    save_notes(&database)?;
    update_category_note_counts()?;
    
    Ok(database.notes[note_index].clone())
}

pub async fn delete_note(id: String) -> Result<(), String> {
    let mut database = load_notes()?;
    database.notes.retain(|note| note.id != id);
    save_notes(&database)?;
    update_category_note_counts()?;
    Ok(())
}

pub async fn get_notes() -> Result<Vec<Note>, String> {
    let database = load_notes()?;
    Ok(database.notes)
}

pub async fn get_notes_by_category(category_path: Vec<String>) -> Result<Vec<Note>, String> {
    let database = load_notes()?;
    let notes: Vec<Note> = database.notes.into_iter()
        .filter(|note| note.category_path.starts_with(&category_path))
        .collect();
    Ok(notes)
}

pub async fn save_note_position(note_id: String, x: f64, y: f64) -> Result<(), String> {
    let mut database = load_notes()?;
    
    if let Some(note) = database.notes.iter_mut().find(|n| n.id == note_id) {
        note.position = Some(GraphPosition {
            x,
            y,
            z_index: None,
        });
        save_notes(&database)?;
        Ok(())
    } else {
        Err(format!("Note with id {} not found", note_id))
    }
}

pub async fn get_all_note_positions() -> Result<Vec<(String, GraphPosition)>, String> {
    let database = load_notes()?;
    let positions: Vec<(String, GraphPosition)> = database.notes
        .iter()
        .filter_map(|note| {
            note.position.as_ref().map(|pos| (note.id.clone(), pos.clone()))
        })
        .collect();
    Ok(positions)
}