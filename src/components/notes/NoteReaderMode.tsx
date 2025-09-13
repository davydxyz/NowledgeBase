import { useState } from 'react';
import { Note } from '../../types';

interface NoteReaderModeProps {
  note: Note;
  onClose: () => void;
  onEdit: (id: string, content: string, title?: string) => void;
}

export function NoteReaderMode({ note, onClose, onEdit }: NoteReaderModeProps) {
  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [fontFamily, setFontFamily] = useState('system');
  const [editContent, setEditContent] = useState(note.content);
  const [editTitle, setEditTitle] = useState(note.title);

  const fontFamilies = {
    system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
    readable: '"Helvetica Neue", Helvetica, Arial, sans-serif'
  };

  const handleSave = async () => {
    if (editContent.trim() && editTitle.trim()) {
      try {
        await onEdit(note.id, editContent.trim(), editTitle.trim());
        onClose(); // Close modal after successful save
      } catch (error) {
        console.error('Failed to save note:', error);
        // Could add error state here if needed
      }
    }
  };

  const handleDiscard = () => {
    onClose(); // Close modal after discarding changes
  };

  const increaseFontSize = () => setFontSize(prev => Math.min(prev + 2, 32));
  const decreaseFontSize = () => setFontSize(prev => Math.max(prev - 2, 12));
  const increaseLineHeight = () => setLineHeight(prev => Math.min(prev + 0.1, 2.5));
  const decreaseLineHeight = () => setLineHeight(prev => Math.max(prev - 0.1, 1.0));

  return (
    <div className="reader-mode-overlay">
      <div className="reader-mode-container">
        {/* Header with controls */}
        <div className="reader-mode-header">
          <div className="reader-mode-title">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="reader-title-input"
              style={{
                fontSize: '24px',
                fontWeight: 600,
                fontFamily: fontFamilies[fontFamily as keyof typeof fontFamilies],
              }}
              placeholder="Enter note title..."
            />
            <div className="note-meta-reader">
              <span className="reader-category">
                {note.category_path.join(' → ')}
              </span>
              <span className="reader-date">
                {new Date(note.timestamp).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <div className="reader-controls">
            {/* Font Size Controls */}
            <div className="control-group">
              <label>Size</label>
              <div className="control-buttons">
                <button 
                  className="control-btn"
                  onClick={decreaseFontSize}
                  title="Decrease font size"
                >
                  A-
                </button>
                <span className="control-value">{fontSize}px</span>
                <button 
                  className="control-btn"
                  onClick={increaseFontSize}
                  title="Increase font size"
                >
                  A+
                </button>
              </div>
            </div>

            {/* Line Height Controls */}
            <div className="control-group">
              <label>Spacing</label>
              <div className="control-buttons">
                <button 
                  className="control-btn"
                  onClick={decreaseLineHeight}
                  title="Decrease line spacing"
                >
                  ≡-
                </button>
                <span className="control-value">{lineHeight.toFixed(1)}</span>
                <button 
                  className="control-btn"
                  onClick={increaseLineHeight}
                  title="Increase line spacing"
                >
                  ≡+
                </button>
              </div>
            </div>

            {/* Font Family */}
            <div className="control-group">
              <label>Font</label>
              <select 
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="font-selector"
              >
                <option value="system">System</option>
                <option value="serif">Serif</option>
                <option value="mono">Monospace</option>
                <option value="readable">Readable</option>
              </select>
            </div>

          </div>
        </div>

        {/* Content Area - Always in Edit Mode */}
        <div className="reader-mode-content">
          <div className="reader-edit-mode">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="reader-edit-textarea"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
                fontFamily: fontFamilies[fontFamily as keyof typeof fontFamilies],
              }}
              autoFocus
            />
            <div className="reader-edit-actions">
              <button 
                className="save-btn-reader"
                onClick={handleSave}
                disabled={!editContent.trim() || !editTitle.trim()}
              >
                ✓ Save Changes
              </button>
              <button 
                className="cancel-btn-reader"
                onClick={handleDiscard}
              >
                ✕ Discard Changes
              </button>
            </div>
          </div>
        </div>

        {/* Footer with additional info */}
        <div className="reader-mode-footer">
          <div className="reader-stats">
            <span>📝 {note.content.split(' ').length} words</span>
            <span>📄 {note.content.split('\n').length} lines</span>
            <span>🔤 {note.content.length} characters</span>
          </div>
          
          {note.tags && note.tags.length > 0 && (
            <div className="reader-tags">
              {note.tags.map((tag, index) => (
                <span key={index} className="reader-tag">{tag}</span>
              ))}
            </div>
          )}
          
          {note.ai_confidence && (
            <div className="reader-ai-info">
              🤖 AI Confidence: {Math.round(note.ai_confidence * 100)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}