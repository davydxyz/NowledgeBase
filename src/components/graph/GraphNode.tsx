import { useState, memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Note } from '../../types';

interface GraphNodeData {
  note: Note;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onNodeClick: (nodeId: string) => void;
  onNodeHover: (nodeId: string | null) => void;
  onStartLinking: (nodeId: string, position: { x: number; y: number }) => void;
  isLinkingMode: boolean;
  isLinkingSource: boolean;
  isHovered: boolean;
  isLocked: boolean;
}

export const GraphNode = memo(({ data }: NodeProps<GraphNodeData>) => {
  const { note, onEdit, onDelete, onNodeClick, onNodeHover, onStartLinking, isLinkingMode, isLinkingSource, isHovered, isLocked } = data;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleEdit = async () => {
    if (isEditing) {
      try {
        await onEdit(note.id, editContent);
        setIsEditing(false);
      } catch (error) {
        console.error('Failed to update note:', error);
      }
    } else {
      setEditContent(note.content);
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setEditContent(note.content);
    setIsEditing(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setShowDeleteConfirm(false);
      await onDelete(note.id);
    } catch (error) {
      console.error('Delete error:', error);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getCategoryColor = () => {
    // Generate a consistent color based on the category path
    if (note.category_path.length === 0) return '#6b7280';
    
    const categoryString = note.category_path.join('');
    let hash = 0;
    for (let i = 0; i < categoryString.length; i++) {
      hash = categoryString.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 60%, 70%)`;
  };

  // Handle reader mode at a higher level to escape ReactFlow transforms
  const handleOpenReader = () => {
    // Dispatch custom event to open reader mode at app level
    window.dispatchEvent(new CustomEvent('openReaderMode', {
      detail: { note, onEdit, onClose: () => {} }
    }));
  };

  return (
    <div className="graph-node">
      {/* Handles for horizontal connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="graph-node-handle"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="graph-node-handle"
      />

      <div 
        className={`graph-node-content ${isLinkingMode ? 'linking-mode' : ''} ${isLinkingSource ? 'linking-source' : ''} ${isHovered ? 'linking-target-hover' : ''}`}
        style={{ borderLeftColor: getCategoryColor() }}
        onClick={(e) => {
          // Only handle node clicks if we're in linking mode
          if (isLinkingMode) {
            e.stopPropagation();
            onNodeClick(note.id);
          }
        }}
        onMouseEnter={() => {
          onNodeHover(note.id);
        }}
        onMouseLeave={() => {
          onNodeHover(null);
        }}
      >
        {/* Node Header */}
        <div className="graph-node-header">
          <div className="graph-node-title">
            {truncateText(note.title, 30)}
          </div>
          <div className="graph-node-actions">
            <button
              className="graph-node-action-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? '−' : '+'}
            </button>
          </div>
        </div>

        {/* Category Path */}
        {note.category_path.length > 0 && (
          <div className="graph-node-category">
            {note.category_path.join(' → ')}
          </div>
        )}

        {/* Content Preview */}
        <div className="graph-node-preview">
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="graph-node-textarea"
              autoFocus
            />
          ) : (
            <div 
              className="graph-node-text"
              onClick={() => !isLinkingMode && handleOpenReader()}
              style={{ cursor: !isLinkingMode ? 'pointer' : 'default' }}
              title={!isLinkingMode ? "Click to edit note" : ""}
            >
              {isExpanded 
                ? note.content 
                : truncateText(note.content, 100)
              }
            </div>
          )}
        </div>

        {/* Show actions only if not locked */}
        {!isLocked && (isExpanded || isEditing || true) && (
          <div className="graph-node-expanded-actions">
            {isEditing ? (
              <>
                <button
                  className="graph-node-action-btn save"
                  onClick={handleEdit}
                  title="Save"
                >
                  ✓
                </button>
                <button
                  className="graph-node-action-btn cancel"
                  onClick={handleCancel}
                  title="Cancel"
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                <button
                  className="graph-node-action-btn delete"
                  onClick={handleDeleteClick}
                  title="Delete"
                >
                  🗑️
                </button>
                <button
                  className="graph-node-action-btn link"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Get the exact position of the button relative to the graph container
                    const buttonRect = e.currentTarget.getBoundingClientRect();
                    const graphContainer = document.querySelector('.react-flow-wrapper');
                    const containerRect = graphContainer ? graphContainer.getBoundingClientRect() : { left: 0, top: 0 };
                    
                    const buttonPosition = {
                      x: buttonRect.left - containerRect.left + buttonRect.width / 2,  // Relative to container
                      y: buttonRect.top - containerRect.top + buttonRect.height / 2   // Relative to container
                    };
                    onStartLinking(note.id, buttonPosition);
                  }}
                  title="Create Link"
                >
                  🔗
                </button>
              </>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div className="graph-node-timestamp">
          {new Date(note.timestamp).toLocaleDateString()}
        </div>
        
        {/* Custom Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <>
            {/* Backdrop */}
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={handleDeleteCancel}
            >
              {/* Modal */}
              <div 
                className="graph-node-delete-modal"
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  minWidth: '300px',
                  maxWidth: '400px',
                  textAlign: 'center',
                  border: '1px solid #e0e0e0'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ 
                  marginBottom: '16px', 
                  fontSize: '18px',
                  fontWeight: '600', 
                  color: '#333' 
                }}>
                  Delete Note?
                </div>
                <div style={{ 
                  marginBottom: '24px', 
                  fontSize: '14px',
                  color: '#666',
                  lineHeight: '1.4'
                }}>
                  Are you sure you want to delete:<br />
                  <strong>"{truncateText(note.title, 50)}"</strong>
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  justifyContent: 'center' 
                }}>
                  <button
                    onClick={handleDeleteCancel}
                    style={{
                      padding: '10px 20px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      background: 'white',
                      color: '#333',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#f5f5f5';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    style={{
                      padding: '10px 20px',
                      border: '1px solid #ff4444',
                      borderRadius: '6px',
                      background: '#ff4444',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#e63939';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = '#ff4444';
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

GraphNode.displayName = 'GraphNode';