import { useState, useEffect } from "react";
import { CategoryTree } from "./CategoryTree";
import { CategoryPicker } from "./components/shared/CategoryPicker";
import { ChatContainer } from "./components/chat/ChatContainer";
import { ChatInput } from "./components/chat/ChatInput";
import { NotesContainer } from "./components/notes/NotesContainer";
import { GraphContainer } from "./components/graph/GraphContainer";
import { ErrorMessage } from "./components/shared/ErrorMessage";
import { ModeToggle } from "./components/shared/ModeToggle";
import { Toast } from "./components/shared/Toast";
import { MemoSpace } from "./components/shared/MemoSpace";
import { NoteReaderMode } from "./components/notes/NoteReaderMode";
import { useChat } from "./hooks/useChat";
import { useToast } from "./hooks/useToast";
import { useAppData } from "./contexts/AppDataContext";
import { AppMode } from "./types";
import "./styles/modals.css";

function App() {
  // App state
  const [currentMode, setCurrentMode] = useState<AppMode>("chat");
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);
  
  // Global modal state (isolated from ReactFlow transforms)
  const [globalReaderMode, setGlobalReaderMode] = useState<{
    isOpen: boolean;
    noteId?: string; // Store just the ID, get fresh note data from context
    onEdit?: (id: string, content: string) => Promise<void>;
    onClose?: () => void;
  }>({ isOpen: false });
  
  // Unified data management
  const {
    data,
    loadAllData,
    saveNote,
    updateNote,
    updateNoteWithTitle,
    deleteNote,
    deleteCategory,
    setSelectedCategory,
    getFilteredNotes,
  } = useAppData();

  // Chat functionality  
  const {
    messages,
    loading: chatLoading,
    currentInput,
    responseType,
    setCurrentInput,
    setResponseType,
    sendMessage,
  } = useChat();

  // Toast functionality
  const { toast, showSuccess, showError, hideToast } = useToast();

  // Modal state
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [pendingNoteContent, setPendingNoteContent] = useState("");
  const [pendingNoteTitle, setPendingNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  // Get filtered notes from context
  const filteredNotes = getFilteredNotes();

  // Global modal event handlers
  useEffect(() => {
    const handleOpenReader = (event: any) => {
      const { note, onEdit, onClose } = event.detail;
      setGlobalReaderMode({
        isOpen: true,
        noteId: note.id,
        onEdit,
        onClose,
      });
    };

    const handleCloseReader = () => {
      setGlobalReaderMode({ isOpen: false });
    };

    window.addEventListener('openReaderMode', handleOpenReader);
    window.addEventListener('closeReaderMode', handleCloseReader);

    return () => {
      window.removeEventListener('openReaderMode', handleOpenReader);
      window.removeEventListener('closeReaderMode', handleCloseReader);
    };
  }, []);

  // Handle chat form submission
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInput.trim() || chatLoading) return;
    
    const question = currentInput.trim();
    setCurrentInput("");
    await sendMessage(question, responseType);
  };

  // Handle saving chat response to notes (streamlined)
  const handleSaveChatToNotes = async (question: string, response: string) => {
    const content = `Q: ${question}\n\nA: ${response}`;
    try {
      // Save directly with "Chat" category - no modal needed, no custom title
      await saveNote(content, ["Chat"], undefined);
      showSuccess("💾 Chat saved to notes!");
    } catch (error) {
      console.error("Failed to save chat:", error);
      showError("Failed to save chat. Please try again.");
    }
  };

  // Handle saving chat response with custom categorization
  const handleSaveChatWithCategories = (question: string, response: string) => {
    const content = `Q: ${question}\n\nA: ${response}`;
    setPendingNoteContent(content);
    setPendingNoteTitle(question.substring(0, 60)); // Use question as default title
    setShowCategoryPicker(true);
  };

  // Handle saving new note
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    
    setPendingNoteContent(noteContent.trim());
    setPendingNoteTitle(""); // Let user enter title
    setShowCategoryPicker(true);
  };

  // Handle category picker save
  const handleCategoryPickerSave = async (categoryPath: string[], customTitle?: string) => {
    setNoteSaving(true);
    setShowCategoryPicker(false);
    
    try {
      await saveNote(pendingNoteContent, categoryPath, customTitle);
      setNoteContent("");
      setPendingNoteContent("");
      setPendingNoteTitle("");
      showSuccess("Note saved successfully!");
    } catch (error) {
      console.error("Failed to save note:", error);
      showError("Failed to save note. Please try again.");
      setShowCategoryPicker(true); // Reopen picker
    } finally {
      setNoteSaving(false);
    }
  };

  // Handle category picker cancel
  const handleCategoryPickerCancel = () => {
    setShowCategoryPicker(false);
    setPendingNoteContent("");
    setPendingNoteTitle("");
  };

  // Handle category selection
  const handleCategorySelect = (categoryPath: string[]) => {
    setSelectedCategory(categoryPath);
  };

  // Handle sidebar resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  // Handle mouse move for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = Math.max(250, Math.min(800, e.clientX));
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Handle mode change
  const handleModeChange = (mode: AppMode) => {
    setCurrentMode(mode);
    if (mode === "chat") {
      setSelectedCategory(null);
    }
  };

  return (
    <div className="app">
      <div className="app-layout">
        {/* Sidebar - Categories for notes/graph modes, Memo for chat mode */}
        <div className="sidebar" style={{ width: `${sidebarWidth}px` }}>
          {currentMode === "chat" ? (
            <MemoSpace />
          ) : (
            <CategoryTree 
              onCategorySelect={handleCategorySelect}
              selectedCategory={data.uiState.selectedCategory}
              onCreateCategory={() => {}} // Handled by CategoryTree
              onCategoryDeleted={async () => {
                // Trigger a reload of all data to refresh the UI
                await loadAllData();
              }}
              onDeleteCategory={deleteCategory}
              reloadTrigger={data.uiState.categoryReloadTrigger}
              contextCategories={data.categories}
            />
          )}
          <div 
            className="sidebar-resize-handle"
            onMouseDown={handleMouseDown}
          />
        </div>
        
        {/* Main content with consistent header */}
        <div className="main-content">
          {/* Consistent header across all modes */}
          <div className="app-header">
            <h1> NowledgeBase</h1>
            <ModeToggle 
              currentMode={currentMode}
              onModeChange={handleModeChange}
            />
          </div>
          
          {data.errors.notes && (
            <ErrorMessage 
              message={data.errors.notes}
              onClose={() => {}} // Context manages errors
            />
          )}
          
          {/* Mode-specific content */}
          <div className="mode-content">
            {currentMode === "graph" ? (
              /* Graph Mode - Full screen container */
              <div className="graph-mode-full-screen">
                <GraphContainer
                  notes={data.notes}
                  selectedCategory={data.uiState.selectedCategory}
                  onEdit={async (id: string, content: string) => {
                    await updateNote(id, content);
                  }}
                  onDelete={deleteNote}
                  onReload={async () => {}} // Context auto-reloads
                />
              </div>
            ) : currentMode === "chat" ? (
              /* Chat Mode */
              <div className="chat-mode-content">
                <ChatContainer 
                  messages={messages}
                  onSaveToNotes={handleSaveChatToNotes}
                  onSaveWithCategories={handleSaveChatWithCategories}
                />
                <ChatInput
                  question={currentInput}
                  responseType={responseType}
                  loading={chatLoading}
                  onQuestionChange={setCurrentInput}
                  onResponseTypeChange={setResponseType}
                  onSubmit={handleChatSubmit}
                />
              </div>
            ) : (
              /* Notes Mode */
              <div className="notes-mode-content">
                <form onSubmit={handleSaveNote} className="note-form">
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Capture your thoughts, ideas, or interesting quotes..."
                    rows={4}
                    disabled={noteSaving}
                  />
                  <button type="submit" disabled={noteSaving || !noteContent.trim()}>
                    {noteSaving ? "Saving & Organizing..." : "Save Note"}
                  </button>
                </form>
                
                <NotesContainer
                  notes={data.notes}
                  filteredNotes={filteredNotes}
                  selectedCategory={data.uiState.selectedCategory}
                  onEdit={async (id: string, content: string) => {
                    await updateNote(id, content);
                  }}
                  onDelete={deleteNote}
                  onClearFilter={() => setSelectedCategory(null)}
                  onReload={async () => {}} // Context auto-reloads
                />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Enhanced Category Picker Modal */}
      {showCategoryPicker && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Choose Category</h3>
              <button 
                className="modal-close-btn"
                onClick={handleCategoryPickerCancel}
                title="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <CategoryPicker
                onSelect={handleCategoryPickerSave}
                allowCreateNew={true}
                showTitleInput={true}
                defaultTitle={pendingNoteTitle}
              />
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={handleCategoryPickerCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      {/* Global Reader Mode - isolated from ReactFlow transforms */}
      {globalReaderMode.isOpen && globalReaderMode.noteId && (() => {
        const currentNote = data.notes.find(n => n.id === globalReaderMode.noteId);
        if (!currentNote) return null;
        
        return (
          <NoteReaderMode
            note={currentNote}
            onClose={() => {
              setGlobalReaderMode({ isOpen: false });
              if (globalReaderMode.onClose) {
                globalReaderMode.onClose();
              }
            }}
            onEdit={async (id: string, content: string, title?: string) => {
              try {
                await updateNoteWithTitle(id, content, title);
              } catch (error) {
                console.error('Failed to update note:', error);
              }
            }}
          />
        );
      })()}
    </div>
  );
}

export default App;