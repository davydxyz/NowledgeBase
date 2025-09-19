import { useState } from 'react';
import { LinkColor } from '../../types/Link';

interface LinkCreationModalProps {
  isOpen: boolean;
  sourceNoteTitle: string;
  targetNoteTitle: string;
  onConfirm: (linkType: string, label?: string, color?: LinkColor, directional?: boolean) => void;
  onCancel: () => void;
}

export function LinkCreationModal({
  isOpen,
  sourceNoteTitle,
  targetNoteTitle,
  onConfirm,
  onCancel,
}: LinkCreationModalProps) {
  const [selectedLinkType, setSelectedLinkType] = useState<string>('Related');
  const [label, setLabel] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<LinkColor>('purple');
  const [isDirectional, setIsDirectional] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [showCustomOptions, setShowCustomOptions] = useState<boolean>(false);

  const linkTypes = [
    { value: 'Related', label: '🔗 Related', description: 'General bidirectional connection', directional: false },
    { value: 'Reference', label: '📚 Reference', description: 'Source → Target (references)', directional: true },
    { value: 'FollowUp', label: '⏭️ Follow Up', description: 'Source → Target (follows up)', directional: true },
    { value: 'Contradicts', label: '❌ Contradicts', description: 'Source → Target (contradicts)', directional: true },
    { value: 'Supports', label: '✅ Supports', description: 'Source → Target (supports)', directional: true },
    { value: 'OptionalLabel', label: '🏷️ Optional Label', description: 'Custom link with label and styling options', directional: false },
  ];

  const handleConfirm = async () => {
    const finalLinkType = selectedLinkType === 'OptionalLabel' ? 'Related' : selectedLinkType;
    const finalLabel = showCustomOptions ? (label.trim() || undefined) : undefined;
    const finalColor = showCustomOptions ? selectedColor : undefined;
    const finalDirectional = showCustomOptions ? isDirectional : undefined;
    
    console.log(`🔗 CREATE LINK CLICKED: ${finalLinkType}, label: "${finalLabel || 'none'}", color: ${finalColor}, directional: ${finalDirectional}`);
    setIsCreating(true);
    try {
      await onConfirm(finalLinkType, finalLabel, finalColor, finalDirectional);
      console.log('✅ Link creation completed');
      setLabel('');
      setSelectedLinkType('Related');
      setSelectedColor('purple');
      setIsDirectional(false);
      setShowCustomOptions(false);
    } catch (error) {
      console.error('❌ Link creation failed:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    setLabel('');
    setSelectedLinkType('Related');
    setSelectedColor('purple');
    setIsDirectional(false);
    setShowCustomOptions(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => {
      // Only close if clicking the overlay itself, not the modal content
      if (e.target === e.currentTarget) {
        handleCancel();
      }
    }}>
      <div className="modal link-creation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Link</h3>
          <button className="modal-close-btn" onClick={handleCancel}>
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="link-preview">
            <div className="link-note source-note">
              <span className="note-title">{sourceNoteTitle}</span>
            </div>
            <div 
              className="link-arrow" 
              style={{ 
                color: showCustomOptions 
                  ? (selectedColor === 'purple' ? '#8b5cf6' : '#eab308') 
                  : '#6b7280' 
              }}
            >
              {showCustomOptions ? (isDirectional ? '→' : '↔') : (linkTypes.find(t => t.value === selectedLinkType)?.directional ? '→' : '↔')}
            </div>
            <div className="link-note target-note">
              <span className="note-title">{targetNoteTitle}</span>
            </div>
          </div>

          <div className="link-type-section">
            <label>Link Type:</label>
            <div className="link-type-buttons">
              {linkTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={`link-type-btn ${selectedLinkType === type.value ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedLinkType(type.value);
                    setShowCustomOptions(type.value === 'OptionalLabel');
                    if (type.value !== 'OptionalLabel') {
                      setLabel('');
                      setSelectedColor('purple');
                      setIsDirectional(false);
                    }
                  }}
                >
                  <div className="link-type-label">{type.label}</div>
                  <div className="link-type-description">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {showCustomOptions && (
            <>
              <div className="link-label-section">
                <label htmlFor="custom-link-label">Custom Label:</label>
                <input
                  id="custom-link-label"
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Enter your custom label..."
                  className="link-label-input"
                />
              </div>

              <div className="link-color-section">
                <label>Link Color:</label>
                <div className="option-buttons">
                  {[{ value: 'purple', label: '🟣 Purple' }, { value: 'yellow', label: '🟡 Yellow' }].map((colorOption) => (
                    <button
                      key={colorOption.value}
                      type="button"
                      className={`option-btn color-${colorOption.value} ${selectedColor === colorOption.value ? 'selected' : ''}`}
                      onClick={() => setSelectedColor(colorOption.value as LinkColor)}
                    >
                      {colorOption.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="link-direction-section">
                <label>Arrow Direction:</label>
                <div className="option-buttons">
                  <button
                    type="button"
                    className={`option-btn ${!isDirectional ? 'selected' : ''}`}
                    onClick={() => setIsDirectional(false)}
                  >
                    ↔ Two-way
                  </button>
                  <button
                    type="button"
                    className={`option-btn ${isDirectional ? 'selected' : ''}`}
                    onClick={() => setIsDirectional(true)}
                  >
                    → One-way
                  </button>
                </div>
              </div>
            </>
          )}

          {!showCustomOptions && (
            <div className="link-label-section">
            <label htmlFor="link-label">Optional Label:</label>
            <input
              id="link-label"
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
          <button className="btn btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleConfirm}
            disabled={isCreating}
          >
            {isCreating ? '🔄 Creating...' : 'Create Link'}
          </button>
        </div>
      </div>
    </div>
  );
}