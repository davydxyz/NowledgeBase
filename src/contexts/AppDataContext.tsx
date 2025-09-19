import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { Note, Category, NoteLink, GraphPosition, LinkColor } from '../types';
import { ApiService } from '../services/api';

// Unified app data state
interface AppData {
  notes: Note[];
  categories: Category[];
  links: NoteLink[];
  positions: Map<string, GraphPosition>;
  
  // Loading states
  loading: {
    notes: boolean;
    categories: boolean;
    links: boolean;
    positions: boolean;
  };
  
  // Error states
  errors: {
    notes: string | null;
    categories: string | null;
    links: string | null;
    positions: string | null;
  };
  
  // UI state that persists across mode switches
  uiState: {
    selectedCategory: string[] | null;
    searchQuery: string;
    graphViewport: { x: number; y: number; zoom: number };
    categoryReloadTrigger: number; // Increment to trigger category reload
  };
}

// Action types for state management
type AppDataAction = 
  | { type: 'SET_LOADING'; dataType: keyof AppData['loading']; loading: boolean }
  | { type: 'SET_ERROR'; dataType: keyof AppData['errors']; error: string | null }
  | { type: 'SET_NOTES'; notes: Note[] }
  | { type: 'ADD_NOTE'; note: Note }
  | { type: 'UPDATE_NOTE'; id: string; note: Note }
  | { type: 'DELETE_NOTE'; id: string }
  | { type: 'SET_CATEGORIES'; categories: Category[] }
  | { type: 'ADD_CATEGORY'; category: Category }
  | { type: 'UPDATE_CATEGORY'; id: string; category: Category }
  | { type: 'DELETE_CATEGORY'; id: string }
  | { type: 'SET_LINKS'; links: NoteLink[] }
  | { type: 'ADD_LINK'; link: NoteLink }
  | { type: 'DELETE_LINK'; id: string }
  | { type: 'SET_POSITIONS'; positions: [string, GraphPosition][] }
  | { type: 'UPDATE_POSITION'; noteId: string; position: GraphPosition }
  | { type: 'SET_SELECTED_CATEGORY'; category: string[] | null }
  | { type: 'SET_SEARCH_QUERY'; query: string }
  | { type: 'SET_GRAPH_VIEWPORT'; viewport: { x: number; y: number; zoom: number } }
  | { type: 'TRIGGER_CATEGORY_RELOAD' };

// Initial state
const initialState: AppData = {
  notes: [],
  categories: [],
  links: [],
  positions: new Map(),
  
  loading: {
    notes: false,
    categories: false,
    links: false,
    positions: false,
  },
  
  errors: {
    notes: null,
    categories: null,
    links: null,
    positions: null,
  },
  
  uiState: {
    selectedCategory: null,
    searchQuery: '',
    graphViewport: { x: 0, y: 0, zoom: 0.8 },
    categoryReloadTrigger: 0,
  },
};

// Reducer for state management
function appDataReducer(state: AppData, action: AppDataAction): AppData {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.dataType]: action.loading }
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.dataType]: action.error }
      };
      
    case 'SET_NOTES':
      return { ...state, notes: action.notes };
      
    case 'ADD_NOTE':
      return { ...state, notes: [...state.notes, action.note] };
      
    case 'UPDATE_NOTE':
      return {
        ...state,
        notes: state.notes.map(note => 
          note.id === action.id ? action.note : note
        )
      };
      
    case 'DELETE_NOTE':
      return {
        ...state,
        notes: state.notes.filter(note => note.id !== action.id)
      };
      
    case 'SET_CATEGORIES':
      return { ...state, categories: action.categories };
      
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.category] };
      
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map(cat => 
          cat.id === action.id ? action.category : cat
        )
      };
      
    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter(cat => cat.id !== action.id)
      };
      
    case 'SET_LINKS':
      return { ...state, links: action.links };
      
    case 'ADD_LINK':
      return { ...state, links: [...state.links, action.link] };
      
    case 'DELETE_LINK':
      return {
        ...state,
        links: state.links.filter(link => link.id !== action.id)
      };
      
    case 'SET_POSITIONS':
      return {
        ...state,
        positions: new Map(action.positions)
      };
      
    case 'UPDATE_POSITION':
      const newPositions = new Map(state.positions);
      newPositions.set(action.noteId, action.position);
      return { ...state, positions: newPositions };
      
    case 'SET_SELECTED_CATEGORY':
      return {
        ...state,
        uiState: { ...state.uiState, selectedCategory: action.category }
      };
      
    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        uiState: { ...state.uiState, searchQuery: action.query }
      };
      
    case 'SET_GRAPH_VIEWPORT':
      return {
        ...state,
        uiState: { ...state.uiState, graphViewport: action.viewport }
      };
      
    case 'TRIGGER_CATEGORY_RELOAD':
      return {
        ...state,
        uiState: { ...state.uiState, categoryReloadTrigger: state.uiState.categoryReloadTrigger + 1 }
      };
      
    default:
      return state;
  }
}

// Context type
interface AppDataContextType {
  // State
  data: AppData;
  
  // Data operations
  loadAllData: () => Promise<void>;
  
  // Note operations
  saveNote: (content: string, categoryPath?: string[], customTitle?: string) => Promise<Note>;
  updateNote: (id: string, content: string) => Promise<Note>;
  updateNoteWithTitle: (id: string, content: string, title?: string) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  
  // Category operations
  createCategory: (name: string, parentPath?: string[]) => Promise<Category>;
  renameCategory: (id: string, newName: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  // Link operations
  createLink: (sourceId: string, targetId: string, linkType: string, label?: string, color?: LinkColor, directional?: boolean) => Promise<NoteLink>;
  updateLink: (linkId: string, linkType: string, label?: string, color?: LinkColor, directional?: boolean) => Promise<void>;
  deleteLink: (linkId: string) => Promise<void>;
  
  // Position operations
  updatePosition: (noteId: string, x: number, y: number) => Promise<void>;
  
  // UI state operations
  setSelectedCategory: (category: string[] | null) => void;
  setSearchQuery: (query: string) => void;
  setGraphViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  
  // Computed data
  getFilteredNotes: () => Note[];
  getNotesInCategory: (categoryPath: string[]) => Note[];
  getLinksForNote: (noteId: string) => NoteLink[];
}

// Create context
const AppDataContext = createContext<AppDataContextType | null>(null);

// Provider component
export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [data, dispatch] = useReducer(appDataReducer, initialState);
  
  // Load all data on mount
  const loadAllData = useCallback(async () => {
    try {
      // Load in parallel for efficiency
      dispatch({ type: 'SET_LOADING', dataType: 'notes', loading: true });
      dispatch({ type: 'SET_LOADING', dataType: 'categories', loading: true });
      dispatch({ type: 'SET_LOADING', dataType: 'links', loading: true });
      dispatch({ type: 'SET_LOADING', dataType: 'positions', loading: true });
      
      const [notes, categories, links, positions, viewport] = await Promise.all([
        ApiService.getNotes(),
        ApiService.getCategories(),
        ApiService.getAllNoteLinks(),
        ApiService.getAllNotePositions(),
        ApiService.getGraphViewport().catch(() => ({ x: 0, y: 0, zoom: 0.8 })), // Use default if load fails
      ]);
      
      // Debug: Log what we got from the backend
      console.log(`🔍 BACKEND DATA LOADED: ${notes.length} notes, ${links.length} links`);
      if (links.length > 0) {
        console.log(`🔗 First link from backend:`, links[0]);
      }
      
      dispatch({ type: 'SET_NOTES', notes });
      dispatch({ type: 'SET_CATEGORIES', categories });
      dispatch({ type: 'SET_LINKS', links });
      dispatch({ type: 'SET_POSITIONS', positions });
      dispatch({ type: 'SET_GRAPH_VIEWPORT', viewport });
      
      // Clear any previous errors
      dispatch({ type: 'SET_ERROR', dataType: 'notes', error: null });
      dispatch({ type: 'SET_ERROR', dataType: 'categories', error: null });
      dispatch({ type: 'SET_ERROR', dataType: 'links', error: null });
      dispatch({ type: 'SET_ERROR', dataType: 'positions', error: null });
      
    } catch (error) {
      console.error('Failed to load data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch({ type: 'SET_ERROR', dataType: 'notes', error: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', dataType: 'notes', loading: false });
      dispatch({ type: 'SET_LOADING', dataType: 'categories', loading: false });
      dispatch({ type: 'SET_LOADING', dataType: 'links', loading: false });
      dispatch({ type: 'SET_LOADING', dataType: 'positions', loading: false });
    }
  }, []);
  
  // Note operations with optimistic updates
  const saveNote = useCallback(async (content: string, categoryPath?: string[], customTitle?: string): Promise<Note> => {
    dispatch({ type: 'SET_LOADING', dataType: 'notes', loading: true });
    try {
      const note = await ApiService.saveNote(content, categoryPath || [], customTitle);
      dispatch({ type: 'ADD_NOTE', note });
      
      // Reload categories from backend to ensure new categories are shown
      const updatedCategories = await ApiService.getCategories();
      dispatch({ type: 'SET_CATEGORIES', categories: updatedCategories });
      
      // Also trigger category reload counter for other components
      dispatch({ type: 'TRIGGER_CATEGORY_RELOAD' });
      dispatch({ type: 'SET_ERROR', dataType: 'notes', error: null });
      return note;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save note';
      dispatch({ type: 'SET_ERROR', dataType: 'notes', error: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', dataType: 'notes', loading: false });
    }
  }, []);
  
  const updateNote = useCallback(async (id: string, content: string): Promise<Note> => {
    try {
      const note = await ApiService.updateNote(id, content);
      dispatch({ type: 'UPDATE_NOTE', id, note });
      return note;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update note';
      dispatch({ type: 'SET_ERROR', dataType: 'notes', error: errorMessage });
      throw error;
    }
  }, []);

  const updateNoteWithTitle = useCallback(async (id: string, content: string, title?: string): Promise<Note> => {
    try {
      const note = await ApiService.updateNoteWithTitle(id, content, title);
      dispatch({ type: 'UPDATE_NOTE', id, note });
      return note;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update note';
      dispatch({ type: 'SET_ERROR', dataType: 'notes', error: errorMessage });
      throw error;
    }
  }, []);
  
  const deleteNote = useCallback(async (id: string): Promise<void> => {
    try {
      await ApiService.deleteNote(id);
      dispatch({ type: 'DELETE_NOTE', id });
      
      // Reload categories from backend to update note counts
      const updatedCategories = await ApiService.getCategories();
      dispatch({ type: 'SET_CATEGORIES', categories: updatedCategories });
      
      // Also trigger category reload counter for other components
      dispatch({ type: 'TRIGGER_CATEGORY_RELOAD' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete note';
      dispatch({ type: 'SET_ERROR', dataType: 'notes', error: errorMessage });
      throw error;
    }
  }, []);
  
  // Link operations
  const createLink = useCallback(async (sourceId: string, targetId: string, linkType: string, label?: string, color?: LinkColor, directional?: boolean): Promise<NoteLink> => {
    console.log(`🔗 CONTEXT CREATE LINK: ${sourceId.substring(0,8)} → ${targetId.substring(0,8)}, type: ${linkType}, color: ${color}, directional: ${directional}`);
    try {
      // Use new API method if color or directional properties are specified
      const link = (color || directional !== undefined) 
        ? await ApiService.createNoteLinkWithOptions(sourceId, targetId, linkType, label, color, directional)
        : await ApiService.createNoteLink(sourceId, targetId, linkType, label);
      console.log(`✅ CONTEXT: Link created with ID ${link.id}`);
      dispatch({ type: 'ADD_LINK', link });
      return link;
    } catch (error) {
      console.error(`❌ CONTEXT: Create link failed:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create link';
      dispatch({ type: 'SET_ERROR', dataType: 'links', error: errorMessage });
      throw error;
    }
  }, []);
  
  const updateLink = useCallback(async (linkId: string, linkType: string, label?: string, color?: LinkColor, directional?: boolean): Promise<void> => {
    try {
      // Find the link first before deleting
      const oldLink = data.links.find(link => link.id === linkId);
      if (!oldLink) {
        throw new Error('Link not found');
      }
      
      // Delete old link and create new one (as per existing implementation)
      await ApiService.deleteNoteLink(linkId);
      const newLink = (color || directional !== undefined) 
        ? await ApiService.createNoteLinkWithOptions(oldLink.source_id, oldLink.target_id, linkType, label, color, directional)
        : await ApiService.createNoteLink(oldLink.source_id, oldLink.target_id, linkType, label);
      dispatch({ type: 'DELETE_LINK', id: linkId });
      dispatch({ type: 'ADD_LINK', link: newLink });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update link';
      dispatch({ type: 'SET_ERROR', dataType: 'links', error: errorMessage });
      throw error;
    }
  }, [data.links]);
  
  const deleteLink = useCallback(async (linkId: string): Promise<void> => {
    try {
      await ApiService.deleteNoteLink(linkId);
      dispatch({ type: 'DELETE_LINK', id: linkId });
      dispatch({ type: 'SET_ERROR', dataType: 'links', error: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete link';
      dispatch({ type: 'SET_ERROR', dataType: 'links', error: errorMessage });
      throw error;
    }
  }, []);
  
  // Position operations
  const updatePosition = useCallback(async (noteId: string, x: number, y: number): Promise<void> => {
    // Optimistic update
    dispatch({ type: 'UPDATE_POSITION', noteId, position: { x, y, z_index: undefined } });
    
    try {
      await ApiService.saveNotePosition(noteId, x, y);
    } catch (error) {
      // Revert optimistic update on error
      await loadAllData();
      const errorMessage = error instanceof Error ? error.message : 'Failed to save position';
      dispatch({ type: 'SET_ERROR', dataType: 'positions', error: errorMessage });
      throw error;
    }
  }, [loadAllData]);
  
  // Category operations (implement similar pattern)
  const createCategory = useCallback(async (name: string, parentPath?: string[]): Promise<Category> => {
    try {
      const category = await ApiService.createCategory(name, parentPath);
      dispatch({ type: 'ADD_CATEGORY', category });
      return category;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create category';
      dispatch({ type: 'SET_ERROR', dataType: 'categories', error: errorMessage });
      throw error;
    }
  }, []);
  
  const renameCategory = useCallback(async (id: string, newName: string): Promise<void> => {
    try {
      await ApiService.renameCategory(id, newName);
      // Reload categories to get updated data
      const categories = await ApiService.getCategories();
      dispatch({ type: 'SET_CATEGORIES', categories });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to rename category';
      dispatch({ type: 'SET_ERROR', dataType: 'categories', error: errorMessage });
      throw error;
    }
  }, []);
  
  const deleteCategory = useCallback(async (id: string): Promise<void> => {
    try {
      console.log('🗑️ Context: Starting category deletion for ID:', id);
      await ApiService.deleteCategory(id);
      console.log('🗑️ Context: Backend deletion completed');
      
      // Reload both categories and notes from backend to get fresh data
      const [categories, notes] = await Promise.all([
        ApiService.getCategories(),
        ApiService.getNotes()
      ]);
      
      console.log('🗑️ Context: Fresh data loaded - categories:', categories.length, 'notes:', notes.length);
      console.log('🗑️ Context: Categories data:', categories.map(c => ({id: c.id, name: c.name, count: c.note_count})));
      
      dispatch({ type: 'SET_CATEGORIES', categories });
      dispatch({ type: 'SET_NOTES', notes });
      // Trigger category reload for CategoryTree component
      dispatch({ type: 'TRIGGER_CATEGORY_RELOAD' });
      
      console.log('🗑️ Context: State dispatched successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete category';
      dispatch({ type: 'SET_ERROR', dataType: 'categories', error: errorMessage });
      throw error;
    }
  }, []);
  
  // UI state operations
  const setSelectedCategory = useCallback((category: string[] | null) => {
    dispatch({ type: 'SET_SELECTED_CATEGORY', category });
  }, []);
  
  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', query });
  }, []);
  
  const setGraphViewport = useCallback(async (viewport: { x: number; y: number; zoom: number }) => {
    dispatch({ type: 'SET_GRAPH_VIEWPORT', viewport });
    
    // Persist to storage
    try {
      await ApiService.saveGraphViewport(viewport.x, viewport.y, viewport.zoom);
    } catch (error) {
      console.error('Failed to save graph viewport:', error);
    }
  }, []);
  
  // Computed data
  const getFilteredNotes = useCallback((): Note[] => {
    let filtered = data.notes;
    
    // Filter by selected category
    if (data.uiState.selectedCategory) {
      filtered = filtered.filter(note =>
        note.category_path.length >= data.uiState.selectedCategory!.length &&
        data.uiState.selectedCategory!.every((cat, index) => note.category_path[index] === cat)
      );
    }
    
    // Filter by search query
    if (data.uiState.searchQuery) {
      const query = data.uiState.searchQuery.toLowerCase();
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [data.notes, data.uiState.selectedCategory, data.uiState.searchQuery]);
  
  const getNotesInCategory = useCallback((categoryPath: string[]): Note[] => {
    return data.notes.filter(note =>
      note.category_path.length >= categoryPath.length &&
      categoryPath.every((cat, index) => note.category_path[index] === cat)
    );
  }, [data.notes]);
  
  const getLinksForNote = useCallback((noteId: string): NoteLink[] => {
    return data.links.filter(link => 
      link.source_id === noteId || link.target_id === noteId
    );
  }, [data.links]);
  
  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);
  
  const contextValue: AppDataContextType = {
    data,
    loadAllData,
    saveNote,
    updateNote,
    updateNoteWithTitle,
    deleteNote,
    createCategory,
    renameCategory,
    deleteCategory,
    createLink,
    updateLink,
    deleteLink,
    updatePosition,
    setSelectedCategory,
    setSearchQuery,
    setGraphViewport,
    getFilteredNotes,
    getNotesInCategory,
    getLinksForNote,
  };
  
  return (
    <AppDataContext.Provider value={contextValue}>
      {children}
    </AppDataContext.Provider>
  );
}

// Hook to use the context
export function useAppData(): AppDataContextType {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}