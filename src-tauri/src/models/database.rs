use serde::{Deserialize, Serialize};
use crate::models::{Note, Category, NoteLink};

#[derive(Serialize, Deserialize)]
pub struct NotesDatabase {
    pub notes: Vec<Note>,
}

#[derive(Serialize, Deserialize)]
pub struct CategoriesDatabase {
    pub categories: Vec<Category>,
}

#[derive(Serialize, Deserialize)]
pub struct LinksDatabase {
    pub links: Vec<NoteLink>,
}