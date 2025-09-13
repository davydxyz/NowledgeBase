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
            <div className="link-arrow" style={{ color: showCustomOptions ? (selectedColor === 'purple' ? '#8b5cf6' : '#eab308') : '#6b7280' }}>
              {showCustomOptions ? (isDirectional ? '→' : '↔') : (linkTypes.find(t => t.value === selectedLinkType)?.directional ? '→' : '↔')}
            </div>
            <div className="link-note target-note">
              <span className="note-title">{targetNoteTitle}</span>
            </div>
          </div>

          <div className="link-type-section">
            <label>Link Type:</label>
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
            style={{ 
              opacity: isCreating ? 0.7 : 1,
              cursor: isCreating ? 'not-allowed' : 'pointer'
            }}
          >
            {isCreating ? '🔄 Creating...' : 'Create Link'}
          </button>
        </div>
      </div>
    </div>
  );
}