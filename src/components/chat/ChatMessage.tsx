import { ChatMessage as ChatMessageType } from '../../types';

interface ChatMessageProps {
  message: ChatMessageType;
  onSaveToNotes?: (question: string, response: string) => void;
  onSaveWithCategories?: (question: string, response: string) => void;
}

export function ChatMessage({ message, onSaveToNotes, onSaveWithCategories }: ChatMessageProps) {
  const handleQuickSave = () => {
    if (onSaveToNotes && message.canSaveToNotes) {
      onSaveToNotes(message.question, message.response);
    }
  };

  const handleSaveWithCategories = () => {
    if (onSaveWithCategories && message.canSaveToNotes) {
      onSaveWithCategories(message.question, message.response);
    }
  };

  return (
    <div className={`chat-message ${message.response === "Thinking..." ? "loading" : ""}`}>
      <div className="question">
        <strong>Q:</strong> {message.question}
        <span className="response-type-badge">{message.responseType}</span>
      </div>
      <div className="response">
        <strong>A:</strong> {message.response}
        {message.canSaveToNotes && message.response !== "Thinking..." && (
          <div className="save-actions">
            <button 
              className="save-to-notes-btn primary"
              onClick={handleQuickSave}
              title="Quick save to Chat category"
            >
              💾 Save
            </button>
            {onSaveWithCategories && (
              <button 
                className="save-to-notes-btn secondary"
                onClick={handleSaveWithCategories}
                title="Save with custom categorization"
              >
                📁 Categorize
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}