import { invoke } from "@tauri-apps/api/core";
import { Note, Category, NoteLink, LinkColor } from "../types";

/**
 * Central API service for all Tauri command calls
 * Provides type-safe interface to Rust backend
 */
export class ApiService {
  // Chat API
  static async askAI(question: string, responseType: string): Promise<string> {
    return await invoke<string>("ask_ai", { question, response_type: responseType });
  }

  // Notes API
  static async getNotes(): Promise<Note[]> {
    return await invoke<Note[]>("get_notes");
  }

  static async saveNote(content: string, categoryPath: string[], customTitle?: string): Promise<Note> {
    return await invoke<Note>("save_note", { content, categoryPath, customTitle });
  }

  static async updateNote(id: string, content: string): Promise<Note> {
    return await invoke<Note>("update_note", { id, content });
  }

  static async updateNoteWithTitle(id: string, content: string, title?: string): Promise<Note> {
    return await invoke<Note>("update_note_with_title", { id, content, title });
  }

  static async deleteNote(id: string): Promise<void> {
    return await invoke("delete_note", { id });
  }

  // Categories API
  static async getCategories(): Promise<Category[]> {
    return await invoke<Category[]>("get_categories");
  }

  static async createCategory(name: string, parentPath?: string[]): Promise<Category> {
    return await invoke<Category>("create_category", { name, parentPath });
  }

  static async renameCategory(categoryId: string, newName: string): Promise<void> {
    return await invoke("rename_category", { categoryId, newName });
  }

  static async deleteCategory(categoryId: string): Promise<void> {
    return await invoke("delete_category", { categoryId });
  }

  // Smart categorization
  static async getSmartCategorization(content: string) {
    return await invoke("get_smart_categorization", { content });
  }

  // Graph/Linking API
  static async saveNotePosition(noteId: string, x: number, y: number): Promise<void> {
    return await invoke("save_note_position", { noteId, x, y });
  }

  static async getAllNotePositions(): Promise<Array<[string, { x: number, y: number, z_index?: number }]>> {
    return await invoke("get_all_note_positions");
  }

  static async createNoteLink(sourceId: string, targetId: string, linkType: string, label?: string): Promise<NoteLink> {
    return await invoke<NoteLink>("create_note_link", { 
      sourceId: sourceId, 
      targetId: targetId, 
      linkType: linkType, 
      label 
    });
  }

  static async createNoteLinkWithOptions(sourceId: string, targetId: string, linkType: string, label?: string, color?: LinkColor, directional?: boolean): Promise<NoteLink> {
    return await invoke<NoteLink>("create_note_link_with_options", { 
      sourceId: sourceId, 
      targetId: targetId, 
      linkType: linkType, 
      label,
      color: color?.toLowerCase(),
      directional
    });
  }

  static async deleteNoteLink(linkId: string): Promise<void> {
    return await invoke<void>("delete_note_link", { linkId: linkId });
  }

  static async getAllNoteLinks(): Promise<NoteLink[]> {
    return await invoke<NoteLink[]>("get_all_note_links");
  }

  static async getNoteLinks(noteId: string): Promise<NoteLink[]> {
    return await invoke<NoteLink[]>("get_note_links", { note_id: noteId });
  }

  // UI State methods
  static async saveGraphViewport(x: number, y: number, zoom: number): Promise<void> {
    return await invoke<void>("save_graph_viewport", { x, y, zoom });
  }

  static async getGraphViewport(): Promise<{ x: number; y: number; zoom: number }> {
    return await invoke<{ x: number; y: number; zoom: number }>("get_graph_viewport");
  }
}