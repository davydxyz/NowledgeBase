pub mod note;
pub mod category;
pub mod link;
pub mod database;
pub mod ui_state;

// Re-export all public structs for easy importing
pub use note::{Note, GraphPosition};
pub use category::Category;
pub use link::{NoteLink, LinkType, LinkColor};
pub use database::{NotesDatabase, CategoriesDatabase, LinksDatabase};
pub use ui_state::{GraphViewport, UIState, UIStateDatabase};