import { NoteCard } from './NoteCard';
import { Note } from '../../types';

interface NotesContainerProps {
  notes: Note[];
  filteredNotes: Note[];
  selectedCategory: string[] | null;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onClearFilter: () => void;
  onReload: () => void;
}

export function NotesContainer({ 
  notes, 
  filteredNotes, 
  selectedCategory,
  onEdit,
  onDelete,
  onClearFilter,
  onReload
}: NotesContainerProps) {
  return (
    <div className="notes-container">
      {/* Debug info */}
      <div className="debug-info">
        <span>Total notes: {notes.length}</span>
        {selectedCategory && (
          <span> | Filtered: {filteredNotes.length}</span>
        )}
        <button 
          className="reload-btn"
          onClick={onReload}
          style={{ marginLeft: '8px', padding: '2px 6px', fontSize: '12px' }}
        >
          Reload
        </button>
      </div>

      {/* Category filter info */}
      {selectedCategory && (
        <div className="filter-info">
          <span className="filter-label">
            Showing notes in: {selectedCategory.join(" → ")} 
            ({filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''})
          </span>
          <button 
            className="clear-filter-btn"
            onClick={onClearFilter}
          >
            Show All
          </button>
        </div>
      )}
      
      <div className="notes-list">
        {filteredNotes.length === 0 ? (
          <div className="empty-state">
            <p>
              {notes.length === 0 
                ? "No notes yet. Start capturing your ideas!" 
                : selectedCategory 
                  ? `No notes found in "${selectedCategory.join(" → ")}"` 
                  : "No notes to display"
              }
            </p>
          </div>
        ) : (
          filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}