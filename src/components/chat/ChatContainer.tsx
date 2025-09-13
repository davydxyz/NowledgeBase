import { useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatMessage as ChatMessageType } from '../../types';

interface ChatContainerProps {
  messages: ChatMessageType[];
  onSaveToNotes: (question: string, response: string) => void;
  onSaveWithCategories?: (question: string, response: string) => void;
}

export function ChatContainer({ messages, onSaveToNotes, onSaveWithCategories }: ChatContainerProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="chat-container">
      <div className="chat-history">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>Ask a question to get started!</p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onSaveToNotes={onSaveToNotes}
              onSaveWithCategories={onSaveWithCategories}
            />
          ))
        )}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
}