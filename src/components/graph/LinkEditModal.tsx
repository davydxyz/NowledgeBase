import { useState } from 'react';
import { LinkColor } from '../../types/Link';

interface LinkEditModalProps {
  isOpen: boolean;
  sourceNoteTitle: string;
  targetNoteTitle: string;
  currentLink: any;
  onUpdate: (linkType: string, label?: string, color?: LinkColor, directional?: boolean) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function LinkEditModal({
  isOpen,
  sourceNoteTitle,
  targetNoteTitle,
  currentLink,
  onUpdate,
  onDelete,
  onCancel,
}: LinkEditModalProps) {
  // Debug the currentLink data
  console.log('📝 EDIT_MODAL: currentLink received:', currentLink);
  
  // A link is "custom" (Optional Label) only if it has explicit custom properties
  // NOT just because it has directional set (all link types have directional now)
  const isCustomLink = !!(currentLink?.label || currentLink?.color);
  console.log('📝 EDIT_MODAL: isCustomLink =', isCustomLink);
  
  const [selectedLinkType, setSelectedLinkType] = useState<string>(
    isCustomLink ? 'OptionalLabel' : 
    (typeof currentLink?.link_type === 'string' ? currentLink.link_type : 'Related')
  );
  const [label, setLabel] = useState<string>(currentLink?.label || '');
  const initialColor = currentLink?.color ? 
    (typeof currentLink.color === 'string' ? currentLink.color.toLowerCase() as LinkColor : currentLink.color) 
    : 'purple';
  console.log('📝 EDIT_MODAL: initialColor =', initialColor, 'from currentLink.color =', currentLink?.color);
  
  const [selectedColor, setSelectedColor] = useState<LinkColor>(initialColor);
  const [isDirectional, setIsDirectional] = useState<boolean>(currentLink?.directional ?? false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [showCustomOptions, setShowCustomOptions] = useState<boolean>(isCustomLink);
  
  console.log('📝 EDIT_MODAL: Initial state - selectedColor:', selectedColor, 'isDirectional:', isDirectional, 'showCustomOptions:', showCustomOptions);

  const linkTypes = [
    { value: 'Related', label: '🔗 Related', description: 'General bidirectional connection', directional: false },
    { value: 'Reference', label: '📚 Reference', description: 'Source → Target (references)', directional: true },
    { value: 'FollowUp', label: '⏭️ Follow Up', description: 'Source → Target (follows up)', directional: true },
    { value: 'Contradicts', label: '❌ Contradicts', description: 'Source → Target (contradicts)', directional: true },
    { value: 'Supports', label: '✅ Supports', description: 'Source → Target (supports)', directional: true },
    { value: 'OptionalLabel', label: '🏷️ Optional Label', description: 'Custom link with label and styling options', directional: false },
  ];

  const handleUpdate = async () => {
    console.log('Update button clicked');
    const finalLinkType = selectedLinkType === 'OptionalLabel' ? 'Related' : selectedLinkType;
    const finalLabel = showCustomOptions ? (label.trim() || undefined) : undefined;
    const finalColor = showCustomOptions ? selectedColor : undefined;
    const finalDirectional = showCustomOptions ? isDirectional : undefined;
    
    setIsUpdating(true);
    try {
      console.log(`Updating link with type: ${finalLinkType}, label: ${finalLabel}, color: ${finalColor}, directional: ${finalDirectional}`);
      await onUpdate(finalLinkType, finalLabel, finalColor, finalDirectional);
      console.log('Update operation completed');
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    // Tauri apps don't support window.confirm - direct delete
    console.log('Delete button clicked - proceeding with deletion');
    setIsUpdating(true);
    try {
      await onDelete();
      console.log('Delete operation completed');
    } catch (error) {
      console.error('Deletion failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) {
        onCancel();
      }
    }}>
      <div className="modal link-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Connection</h3>
          <button className="modal-close-btn" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="link-preview">
            <div className="link-note source-note">
              <span className="note-title">{sourceNoteTitle}</span>
            </div>
            <div className="link-arrow" style={{ color: showCustomOptions ? (selectedColor === 'purple' ? '#8b5cf6' : '#eab308') : '#6b7280' }}>
              {showCustomOptions ? (isDirectional ? '→' : '↔') : (linkTypes.find(t => t.value === selectedLinkType)?.directional ? '→' : '↔')}
            </div>
            <div className="link-note target-note">
              <span className="note-title">{targetNoteTitle}</span>
            </div>
          </div>

          <div className="link-type-section">
            <label>Connection Type:</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {linkTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={`btn ${selectedLinkType === type.value ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    setSelectedLinkType(type.value);
                    setShowCustomOptions(type.value === 'OptionalLabel');
                    if (type.value !== 'OptionalLabel') {
                      setLabel('');
                      setSelectedColor('purple');
                      setIsDirectional(false);
                    }
                  }}
                  style={{ 
                    textAlign: 'left',
                    background: selectedLinkType === type.value ? '#3b82f6' : '#f3f4f6',
                    color: selectedLinkType === type.value ? 'white' : '#374151',
                    border: '1px solid #d1d5db',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{type.label}</div>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {showCustomOptions && (
            <>
              <div className="link-label-section" style={{ marginBottom: '16px' }}>
                <label htmlFor="edit-custom-link-label">Custom Label:</label>
                <input
                  id="edit-custom-link-label"
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Enter your custom label..."
                  className="link-label-input"
                />
              </div>

              <div className="link-color-section" style={{ marginBottom: '16px' }}>
            <label>Link Color:</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              {[{ value: 'purple', label: '🟣 Purple', color: '#8b5cf6' }, { value: 'yellow', label: '🟡 Yellow', color: '#eab308' }].map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setSelectedColor(colorOption.value as LinkColor)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: `2px solid ${selectedColor === colorOption.value ? colorOption.color : '#d1d5db'}`,
                    background: selectedColor === colorOption.value ? colorOption.color + '20' : '#f9fafb',
                    color: selectedColor === colorOption.value ? colorOption.color : '#374151',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: selectedColor === colorOption.value ? 'bold' : 'normal'
                  }}
                >
                  {colorOption.label}
                </button>
              ))}
            </div>
          </div>

          <div className="link-direction-section" style={{ marginBottom: '16px' }}>
            <label>Arrow Direction:</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setIsDirectional(false)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: `2px solid ${!isDirectional ? '#3b82f6' : '#d1d5db'}`,
                  background: !isDirectional ? '#3b82f620' : '#f9fafb',
                  color: !isDirectional ? '#3b82f6' : '#374151',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: !isDirectional ? 'bold' : 'normal'
                }}
              >
                ↔ Two-way
              </button>
              <button
                type="button"
                onClick={() => setIsDirectional(true)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: `2px solid ${isDirectional ? '#3b82f6' : '#d1d5db'}`,
                  background: isDirectional ? '#3b82f620' : '#f9fafb',
                  color: isDirectional ? '#3b82f6' : '#374151',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: isDirectional ? 'bold' : 'normal'
                }}
              >
                → One-way
              </button>
            </div>
              </div>
            </>
          )}

          {!showCustomOptions && (
            <div className="link-label-section">
            <label htmlFor="edit-link-label">Label:</label>
            <input
              id="edit-link-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Add a custom label for this connection..."
              className="link-label-input"
            />
          </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button 
            className="btn" 
            onClick={handleDelete}
            disabled={isUpdating}
            style={{ 
              background: '#ef4444',
              color: 'white',
              opacity: isUpdating ? 0.7 : 1,
              cursor: isUpdating ? 'not-allowed' : 'pointer'
            }}
          >
            {isUpdating ? '🗑️ Deleting...' : '🗑️ Delete'}
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleUpdate}
            disabled={isUpdating}
            style={{ 
              opacity: isUpdating ? 0.7 : 1,
              cursor: isUpdating ? 'not-allowed' : 'pointer'
            }}
          >
            {isUpdating ? '🔄 Updating...' : '💾 Update'}
          </button>
        </div>
      </div>
    </div>
  );
}