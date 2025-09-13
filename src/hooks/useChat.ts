import { useState, useCallback } from 'react';
import { ChatMessage, ResponseType } from '../types';
import { ApiService } from '../services/api';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const [responseType, setResponseType] = useState<ResponseType>('brief');

  const sendMessage = useCallback(async (question: string, type: ResponseType) => {
    if (!question.trim()) return;

    const messageId = Date.now();
    setLoading(true);

    // Add loading message immediately
    const loadingMessage: ChatMessage = {
      id: messageId,
      question: question.trim(),
      response: "Thinking...",
      responseType: type,
      timestamp: new Date(),
      canSaveToNotes: false,
    };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      const response = await ApiService.askAI(question, type);
      
      // Update with actual response
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, response, canSaveToNotes: true }
            : msg
        )
      );
    } catch (error) {
      // Update with error
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, response: `Error: ${error}`, canSaveToNotes: false }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    loading,
    currentInput,
    responseType,
    setCurrentInput,
    setResponseType,
    sendMessage,
    clearChat,
  };
}