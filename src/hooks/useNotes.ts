import { useState, useEffect, useCallback } from 'react';
import { Note } from '../types';
import { ApiService } from '../services/api';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ApiService.getNotes();
      setNotes(result);
    } catch (err) {
      setError(`Failed to load notes: ${err}`);
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveNote = useCallback(async (content: string, categoryPath: string[]) => {
    try {
      const newNote = await ApiService.saveNote(content, categoryPath);
      setNotes(prev => [newNote, ...prev]);
      return newNote;
    } catch (err) {
      setError(`Failed to save note: ${err}`);
      throw err;
    }
  }, []);

  const updateNote = useCallback(async (id: string, content: string) => {
    try {
      const updatedNote = await ApiService.updateNote(id, content);
      setNotes(prev => prev.map(note => 
        note.id === id ? updatedNote : note
      ));
      return updatedNote;
    } catch (err) {
      setError(`Failed to update note: ${err}`);
      throw err;
    }
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    try {
      await ApiService.deleteNote(id);
      setNotes(prev => prev.filter(note => note.id !== id));
    } catch (err) {
      setError(`Failed to delete note: ${err}`);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-load notes on mount
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  return {
    notes,
    loading,
    error,
    loadNotes,
    saveNote,
    updateNote,
    deleteNote,
    clearError,
  };
}