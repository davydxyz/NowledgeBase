use chrono::Utc;
use uuid::Uuid;
use crate::models::{Category, CategoriesDatabase, NotesDatabase};
use crate::services::storage_service::{get_categories_file_path, save_categories, get_notes_file_path, save_notes};
use crate::services::note_service;
use std::fs;

pub fn load_categories() -> Result<CategoriesDatabase, String> {
    let file_path = get_categories_file_path()?;
    
    if !file_path.exists() {
        // Start with empty categories - respect user's deletion choices
        let database = CategoriesDatabase { categories: Vec::new() };
        save_categories(&database)?;
        return Ok(database);
    }
    
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read categories file: {}", e))?;
    
    let mut database: CategoriesDatabase = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse categories file: {}", e))?;
    
    // Migrate existing categories to new format if needed
    let mut needs_migration = false;
    for category in &mut database.categories {
        if category.full_path.is_empty() {
            needs_migration = true;
            category.full_path = category.path.join(" → ");
        }
        if category.level == 0 && category.path.len() > 1 {
            needs_migration = true;
            category.level = category.path.len() as u32 - 1;
        }
        // Note: created_at will be set by serde default if missing
    }
    
    if needs_migration {
        save_categories(&database)?;
    }
    
    Ok(database)
}

pub fn update_category_note_counts() -> Result<(), String> {
    let notes_file_path = get_notes_file_path()?;
    let notes_content = fs::read_to_string(&notes_file_path)
        .map_err(|e| format!("Failed to read notes file: {}", e))?;
    let notes_db: NotesDatabase = serde_json::from_str(&notes_content)
        .map_err(|e| format!("Failed to parse notes file: {}", e))?;
    
    let mut categories_db = load_categories()?;
    
    // Reset all counts
    for category in &mut categories_db.categories {
        category.note_count = 0;
    }
    
    // Count notes for each category path
    for note in &notes_db.notes {
        // Update count for the exact category and all parent categories
        for category in &mut categories_db.categories {
            if note.category_path.starts_with(&category.path) {
                category.note_count += 1;
            }
        }
    }
    
    save_categories(&categories_db)?;
    Ok(())
}

/// Get a category by its ID
pub fn get_category_by_id(category_id: &str) -> Result<Option<Category>, String> {
    let categories_db = load_categories()?;
    Ok(categories_db.categories.into_iter().find(|cat| cat.id == category_id))
}

/// Get the full category hierarchy as a tree structure
pub fn get_category_hierarchy() -> Result<Vec<Category>, String> {
    let categories_db = load_categories()?;
    let mut hierarchy = categories_db.categories;
    
    // Sort by level first, then by name
    hierarchy.sort_by(|a, b| {
        a.level.cmp(&b.level).then(a.name.cmp(&b.name))
    });
    
    Ok(hierarchy)
}

/// Validate that a category path is valid and consistent
pub fn validate_category_path(path: &[String]) -> Result<bool, String> {
    if path.is_empty() {
        return Ok(false);
    }
    
    let categories_db = load_categories()?;
    
    // Check if the full path exists
    let path_exists = categories_db.categories.iter()
        .any(|cat| cat.path == path);
    
    if !path_exists {
        return Ok(false);
    }
    
    // Validate that all parent paths also exist
    for i in 1..path.len() {
        let parent_path = &path[..i];
        let parent_exists = categories_db.categories.iter()
            .any(|cat| cat.path == parent_path);
        
        if !parent_exists {
            return Err(format!("Parent path {:?} does not exist", parent_path));
        }
    }
    
    Ok(true)
}

/// Safely delete a category and handle all dependent data
pub fn safe_delete_category(category_id: &str) -> Result<(), String> {
    let mut categories_db = load_categories()?;
    
    // Read notes database
    let notes_file_path = get_notes_file_path()?;
    let notes_content = fs::read_to_string(&notes_file_path)
        .map_err(|e| format!("Failed to read notes file: {}", e))?;
    let mut notes_db: NotesDatabase = serde_json::from_str(&notes_content)
        .map_err(|e| format!("Failed to parse notes file: {}", e))?;
    
    // Find the category to delete
    let category = categories_db.categories.iter()
        .find(|cat| cat.id == category_id)
        .ok_or("Category not found")?
        .clone();
    
    // Delete all notes from this category and subcategories
    notes_db.notes.retain(|note| {
        !note.category_path.starts_with(&category.path)
    });
    
    // Remove the category and all its children
    categories_db.categories.retain(|cat| {
        !cat.path.starts_with(&category.path)
    });
    
    save_categories(&categories_db)?;
    save_notes(&notes_db)?;
    update_category_note_counts()?;
    
    Ok(())
}

/// Rebuild the hierarchy information for all categories
pub fn rebuild_hierarchy() -> Result<(), String> {
    let mut categories_db = load_categories()?;
    
    // Update level and full_path for each category
    for category in &mut categories_db.categories {
        category.level = category.path.len() as u32 - 1;
        category.full_path = category.path.join(" → ");
        
        // Set created_at if not present (for backward compatibility)
        if category.created_at.timestamp() == 0 {
            category.created_at = Utc::now();
        }
    }
    
    save_categories(&categories_db)?;
    update_category_note_counts()?;
    
    Ok(())
}

/// Find categories by name with fuzzy matching (case-insensitive)
pub fn find_category_by_name_fuzzy(search_name: &str) -> Result<Vec<Category>, String> {
    let categories_db = load_categories()?;
    let search_lower = search_name.to_lowercase();
    
    let mut matches: Vec<Category> = categories_db.categories.into_iter()
        .filter(|cat| cat.name.to_lowercase().contains(&search_lower))
        .collect();
    
    // Sort by relevance: exact matches first, then starts-with, then contains
    matches.sort_by(|a, b| {
        let a_name_lower = a.name.to_lowercase();
        let b_name_lower = b.name.to_lowercase();
        
        // Exact match
        if a_name_lower == search_lower && b_name_lower != search_lower {
            return std::cmp::Ordering::Less;
        }
        if b_name_lower == search_lower && a_name_lower != search_lower {
            return std::cmp::Ordering::Greater;
        }
        
        // Starts with
        let a_starts = a_name_lower.starts_with(&search_lower);
        let b_starts = b_name_lower.starts_with(&search_lower);
        
        match (a_starts, b_starts) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name), // Alphabetical for same relevance
        }
    });
    
    Ok(matches)
}

/// Create a new category with proper validation and hierarchy setup
pub fn create_category_safe(name: String, parent_path: Option<Vec<String>>) -> Result<Category, String> {
    let mut categories_db = load_categories()?;
    
    // Build the full path
    let mut full_path = parent_path.unwrap_or_else(Vec::new);
    full_path.push(name.clone());
    
    // Validate parent exists if specified
    if full_path.len() > 1 {
        let parent_path = &full_path[..full_path.len() - 1];
        let parent_exists = categories_db.categories.iter()
            .any(|cat| cat.path == parent_path);
        
        if !parent_exists {
            return Err(format!("Parent category {:?} does not exist", parent_path));
        }
    }
    
    // Check for duplicates
    let duplicate_exists = categories_db.categories.iter()
        .any(|cat| cat.path == full_path);
    
    if duplicate_exists {
        return Err(format!("Category with path {:?} already exists", full_path));
    }
    
    // Find parent ID if there is one
    let parent_id = if full_path.len() > 1 {
        let parent_path = &full_path[..full_path.len() - 1];
        categories_db.categories.iter()
            .find(|cat| cat.path == parent_path)
            .map(|cat| cat.id.clone())
    } else {
        None
    };
    
    let level = (full_path.len() as u32).saturating_sub(1);
    let display_path = full_path.join(" → ");
    
    let category = Category {
        id: Uuid::new_v4().to_string(),
        name,
        parent_id,
        full_path: display_path,
        path: full_path,
        level,
        note_count: 0,
        created_at: Utc::now(),
        color: None,
    };
    
    categories_db.categories.push(category.clone());
    save_categories(&categories_db)?;
    
    Ok(category)
}

pub fn rename_category(category_id: String, new_name: String) -> Result<(), String> {
    let mut categories_db = load_categories()?;
    let mut notes_db = note_service::load_notes()?;
    
    // Find the category to rename
    let category_index = categories_db.categories.iter()
        .position(|cat| cat.id == category_id)
        .ok_or("Category not found")?;
    
    let old_path = categories_db.categories[category_index].path.clone();
    let mut new_path = old_path.clone();
    let last_index = new_path.len() - 1;
    new_path[last_index] = new_name.clone();
    
    // Update the category
    categories_db.categories[category_index].name = new_name;
    categories_db.categories[category_index].path = new_path.clone();
    categories_db.categories[category_index].full_path = new_path.join(" → ");
    
    // Update all child categories
    for category in &mut categories_db.categories {
        if category.path.starts_with(&old_path) && category.path.len() > old_path.len() {
            // This is a child category, update its path
            let mut updated_path = new_path.clone();
            updated_path.extend_from_slice(&category.path[old_path.len()..]);
            category.path = updated_path.clone();
            category.full_path = updated_path.join(" → ");
        }
    }
    
    // Update all notes in this category and subcategories
    for note in &mut notes_db.notes {
        if note.category_path.starts_with(&old_path) {
            let mut updated_path = new_path.clone();
            updated_path.extend_from_slice(&note.category_path[old_path.len()..]);
            note.category_path = updated_path;
        }
    }
    
    save_categories(&categories_db)?;
    save_notes(&notes_db)?;
    Ok(())
}