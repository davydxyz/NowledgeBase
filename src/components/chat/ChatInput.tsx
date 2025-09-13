import { FormEvent } from 'react';
import { ResponseType } from '../../types';

interface ChatInputProps {
  question: string;
  responseType: ResponseType;
  loading: boolean;
  onQuestionChange: (value: string) => void;
  onResponseTypeChange: (type: ResponseType) => void;
  onSubmit: (e: FormEvent) => void;
}

export function ChatInput({ 
  question, 
  responseType, 
  loading, 
  onQuestionChange, 
  onResponseTypeChange, 
  onSubmit 
}: ChatInputProps) {
  return (
    <form onSubmit={onSubmit} className="input-form">
      <div className="response-type-selector">
        <label htmlFor="responseType">Type:</label>
        <select 
          id="responseType"
          value={responseType} 
          onChange={(e) => onResponseTypeChange(e.target.value as ResponseType)}
          disabled={loading}
        >
          <option value="yes_no">Yes/No</option>
          <option value="brief">Brief</option>
          <option value="bullet">Bullet</option>
          <option value="detailed">Detailed</option>
        </select>
      </div>
      <textarea
        value={question}
        onChange={(e) => onQuestionChange(e.target.value)}
        placeholder="Ask a question for a concise answer..."
        rows={2}
        disabled={loading}
      />
      <button type="submit" disabled={loading || !question.trim()}>
        {loading ? "Thinking..." : "Ask"}
      </button>
    </form>
  );
}