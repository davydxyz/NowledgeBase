import { AppMode } from '../../types';

interface ModeToggleProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export function ModeToggle({ currentMode, onModeChange }: ModeToggleProps) {
  return (
    <div className="mode-toggle">
      <button 
        className={`mode-btn ${currentMode === "chat" ? "active" : ""}`}
        onClick={() => onModeChange("chat")}
      >
        💬 Chat
      </button>
      <button 
        className={`mode-btn ${currentMode === "notes" ? "active" : ""}`}
        onClick={() => onModeChange("notes")}
      >
        📝 Notes
      </button>
      <button 
        className={`mode-btn ${currentMode === "graph" ? "active" : ""}`}
        onClick={() => onModeChange("graph")}
      >
        🌐 Graph
      </button>
    </div>
  );
}