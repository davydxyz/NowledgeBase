export interface Note {
  id: string;
  title: string;
  content: string;
  category_path: string[];
  timestamp: string;
  tags: string[];
  ai_confidence?: number;
  source?: NoteSource;
  chat_context?: ChatContext;
}

export interface ChatContext {
  question: string;
  response: string;
  timestamp: string;
}

export type NoteSource = 'manual' | 'chat' | 'generated';

export interface NotesDatabase {
  notes: Note[];
}