import { useState } from 'react';
import { Note } from '../../types';
import { NoteReaderMode } from './NoteReaderMode';

interface NoteCardProps {
  note: Note;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}

export function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReaderMode, setIsReaderMode] = useState(false);
  const [editContent, setEditContent] = useState(note.content);

  // Content truncation logic
  const PREVIEW_LENGTH = 200; // characters
  const PREVIEW_LINES = 3; // lines
  const isLongContent = note.content.length > PREVIEW_LENGTH || note.content.split('\n').length > PREVIEW_LINES;
  
  const getPreviewContent = () => {
    if (!isLongContent || isExpanded) return note.content;
    
    const lines = note.content.split('\n').slice(0, PREVIEW_LINES);
    const previewText = lines.join('\n');
    
    if (previewText.length > PREVIEW_LENGTH) {
      return previewText.substring(0, PREVIEW_LENGTH) + '...';
    }
    
    return previewText + (note.content.split('\n').length > PREVIEW_LINES ? '\n...' : '');
  };

  const handleSave = () => {
    if (editContent.trim()) {
      onEdit(note.id, editContent.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditContent(note.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(note.id);
  };

  return (
    <>
      {isReaderMode && (
        <NoteReaderMode
          note={note}
          onClose={() => setIsReaderMode(false)}
          onEdit={onEdit}
        />
      )}
      
      <div className="note-card">
        {isEditing ? (
        /* Edit Mode */
        <div className="note-edit-mode">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="note-edit-textarea"
            rows={4}
            autoFocus
          />
          <div className="note-edit-actions">
            <button 
              className="save-edit-btn"
              onClick={handleSave}
              disabled={!editContent.trim()}
            >
              ✓ Save
            </button>
            <button 
              className="cancel-edit-btn"
              onClick={handleCancel}
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      ) : (
        /* View Mode */
        <div 
          className="note-clickable-area"
          onClick={() => {
            setIsReaderMode(true);
            // Also set reader mode to editing immediately
            setTimeout(() => {
              // This will be handled by opening in edit mode
            }, 0);
          }}
          style={{ cursor: 'pointer' }}
          title="Click anywhere to edit note"
        >
          <div className="note-header">
            <h3 className="note-title">{note.title}</h3>
          </div>
          
          <div className="note-content-wrapper">
            <div className={`note-content ${isLongContent && !isExpanded ? 'note-content-preview' : ''}`}>
              {getPreviewContent()}
            </div>
            
            {isLongContent && (
              <button 
                className="expand-toggle-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
              >
                {isExpanded ? (
                  <>
                    <span>Show Less</span>
                    <span className="expand-icon">▼</span>
                  </>
                ) : (
                  <>
                    <span>Show More</span>
                    <span className="expand-icon">▶</span>
                  </>
                )}
              </button>
            )}
          </div>
          
          <div className="note-meta">
            <div className="note-info">
              <div className="note-category-path">
                {note.category_path.map((cat, index) => (
                  <span key={index} className="category-breadcrumb">
                    {cat}
                    {index < note.category_path.length - 1 && (
                      <span className="breadcrumb-separator">→</span>
                    )}
                  </span>
                ))}
              </div>
              {note.tags && note.tags.length > 0 && (
                <div className="note-tags">
                  {note.tags.map((tag, index) => (
                    <span key={index} className="note-tag">{tag}</span>
                  ))}
                </div>
              )}
              <div className="note-footer">
                {note.ai_confidence && (
                  <span 
                    className="ai-confidence" 
                    title={`AI Confidence: ${Math.round(note.ai_confidence * 100)}%`}
                  >
                    🤖 {Math.round(note.ai_confidence * 100)}%
                  </span>
                )}
                <span className="note-timestamp">
                  {new Date(note.timestamp).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="note-actions">
              <button 
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                title="Delete note"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}