export interface ChatMessage {
  id: number;
  question: string;
  response: string;
  responseType: string;
  timestamp: Date;
  canSaveToNotes?: boolean;
}

export type ResponseType = 'yes_no' | 'brief' | 'bullet' | 'detailed';

export interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
  currentInput: string;
  responseType: ResponseType;
}