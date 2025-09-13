// Re-export all types for easy importing
export * from './Note';
export * from './Chat';
export * from './Category';
export * from './Link';
export * from './Graph';

// Common types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type AppMode = 'chat' | 'notes' | 'graph';