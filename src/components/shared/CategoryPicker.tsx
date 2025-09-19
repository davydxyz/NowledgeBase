import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Category {
  id: string;
  name: string;
  path: string[];
  parent_id?: string;
  note_count: number;
  color?: string;
  level: number;
}

interface CategoryPickerProps {
  onSelect: (path: string[], title?: string) => void;
  selectedPath?: string[];
  allowCreateNew?: boolean;
  showTitleInput?: boolean;
  defaultTitle?: string;
}

export function CategoryPicker({ onSelect, selectedPath, allowCreateNew = true, showTitleInput = false, defaultTitle = "" }: CategoryPickerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedParentPath, setSelectedParentPath] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteTitle, setNoteTitle] = useState(defaultTitle);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const result = await invoke<Category[]>("get_categories");
      setCategories(result);
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryColor = (categoryPath: string[]) => {
    // Generate a consistent color based on the category path
    if (categoryPath.length === 0) return '#6b7280';
    
    const categoryString = categoryPath.join('/');
    let hash = 0;
    for (let i = 0; i < categoryString.length; i++) {
      hash = categoryString.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Create more vibrant and diverse colors
    const hue = Math.abs(hash) % 360;
    const saturation = 65 + (Math.abs(hash >> 8) % 25); // 65-90%
    const lightness = 45 + (Math.abs(hash >> 16) % 20); // 45-65%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const getCategoryIcon = (categoryPath: string[]) => {
    // Different icons for different category levels and types
    if (categoryPath.length === 0) return '📁';
    
    const categoryName = categoryPath[categoryPath.length - 1].toLowerCase();
    
    // Icon mapping based on category name
    const iconMap: { [key: string]: string } = {
      'tech': '💻', 'technology': '💻', 'technical': '💻',
      'work': '💼', 'job': '💼', 'career': '💼',
      'personal': '👤', 'private': '👤',
      'ideas': '💡', 'thoughts': '💭',
      'learning': '📚', 'education': '🎓', 'study': '📖',
      'projects': '🚀', 'project': '🚀',
      'notes': '📝', 'memo': '📝',
      'chat': '💬', 'conversation': '💬',
      'research': '🔬', 'experiment': '🧪',
      'design': '🎨', 'creative': '🎨',
      'finance': '💰', 'money': '💰', 'budget': '💳',
      'health': '🏥', 'fitness': '💪', 'medical': '⚕️',
      'travel': '✈️', 'vacation': '🏖️',
      'food': '🍽️', 'recipe': '👨‍🍳', 'cooking': '👨‍🍳',
      'music': '🎵', 'audio': '🎧',
      'video': '🎬', 'movies': '🎬',
      'books': '📚', 'reading': '📖',
      'games': '🎮', 'gaming': '🕹️',
      'sports': '⚽', 'exercise': '🏃‍♂️'
    };
    
    // Check for exact matches first
    for (const [key, icon] of Object.entries(iconMap)) {
      if (categoryName.includes(key)) {
        return icon;
      }
    }
    
    // Default based on category level
    if (categoryPath.length === 1) return '📂'; // Root categories
    if (categoryPath.length === 2) return '📁'; // First level subcategories  
    return '📄'; // Deep subcategories
  };

  const handleCategorySelect = (category: Category) => {
    // If title input is shown, pass the title (empty or not - backend will generate default if needed)
    onSelect(category.path, showTitleInput ? (noteTitle.trim() || undefined) : undefined);
    setShowCreateForm(false);
  };

  const handleCreateNew = async () => {
    if (!newCategoryName.trim()) return;

    try {
      await invoke("create_category", {
        name: newCategoryName.trim(),
        parentPath: selectedParentPath
      });
      
      // Reload categories
      await loadCategories();
      
      // Select the newly created category
      const newPath = selectedParentPath ? [...selectedParentPath, newCategoryName.trim()] : [newCategoryName.trim()];
      onSelect(newPath, showTitleInput ? (noteTitle.trim() || undefined) : undefined);
      
      // Reset form
      setNewCategoryName("");
      setSelectedParentPath(null);
      setShowCreateForm(false);
      
      // Clear contentEditable content
      const inputElement = document.querySelector('.category-picker-input') as HTMLDivElement;
      if (inputElement) {
        inputElement.textContent = '';
      }
    } catch (error) {
      console.error("Failed to create category:", error);
    }
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setNewCategoryName("");
    setSelectedParentPath(null);
    
    // Clear contentEditable content
    const inputElement = document.querySelector('.category-picker-input') as HTMLDivElement;
    if (inputElement) {
      inputElement.textContent = '';
    }
  };

  const isSelected = (category: Category) => {
    return selectedPath && 
           selectedPath.length === category.path.length &&
           selectedPath.every((segment, index) => segment === category.path[index]);
  };

  const renderCategoryTree = () => {
    // Group categories by their parent
    const categoryMap = new Map<string, Category[]>();
    const rootCategories: Category[] = [];

    filteredCategories.forEach(category => {
      if (category.level === 0) {
        rootCategories.push(category);
      } else if (category.level === 1) {
        const parentName = category.path[0];
        if (!categoryMap.has(parentName)) {
          categoryMap.set(parentName, []);
        }
        categoryMap.get(parentName)!.push(category);
      }
    });

    return (
      <div className="category-tree-picker">
        {rootCategories.map(rootCategory => (
          <div key={rootCategory.id} className="category-branch">
            <div 
              className={`category-picker-item ${isSelected(rootCategory) ? 'selected' : ''}`}
              onClick={() => handleCategorySelect(rootCategory)}
            >
              <div className="category-content">
                <div 
                  className="category-icon"
                  style={{ backgroundColor: getCategoryColor(rootCategory.path) }}
                >
                  {getCategoryIcon(rootCategory.path)}
                </div>
                <span className="category-name">{rootCategory.name}</span>
                <span className="note-count">{rootCategory.note_count}</span>
              </div>
              {allowCreateNew && (
                <button
                  className="add-subcategory-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedParentPath(rootCategory.path);
                    setShowCreateForm(true);
                  }}
                  title="Add subcategory"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M6 0v12M0 6h12" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </button>
              )}
            </div>
            
            {/* Show create form if this category is selected as parent */}
            {showCreateForm && selectedParentPath && 
             selectedParentPath.length === 1 && 
             selectedParentPath[0] === rootCategory.name && (
              <div className="inline-create-form">
                <div className="subcategory-indent">└──</div>
                <div className="create-form-content">
                  <div className="create-form-input-row">
                    <div className="category-icon new-category">
                      📁
                    </div>
                    <input
                      type="text"
                      placeholder="Subcategory name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="inline-category-input"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateNew();
                        } else if (e.key === 'Escape') {
                          setShowCreateForm(false);
                          setNewCategoryName("");
                          setSelectedParentPath(null);
                        }
                      }}
                      autoFocus
                    />
                  </div>
                  <div className="inline-form-actions">
                    <button
                      className="inline-save-btn"
                      onClick={handleCreateNew}
                      disabled={!newCategoryName.trim()}
                      title="Create subcategory"
                    >
                      ✓
                    </button>
                    <button
                      className="inline-cancel-btn"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewCategoryName("");
                        setSelectedParentPath(null);
                      }}
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Render subcategories */}
            {categoryMap.get(rootCategory.name)?.map(subCategory => (
              <div 
                key={subCategory.id}
                className={`category-picker-item subcategory ${isSelected(subCategory) ? 'selected' : ''}`}
                onClick={() => handleCategorySelect(subCategory)}
              >
                <div className="category-content">
                  <div className="subcategory-indent">└──</div>
                  <div 
                    className="category-icon"
                    style={{ backgroundColor: getCategoryColor(subCategory.path) }}
                  >
                    {getCategoryIcon(subCategory.path)}
                  </div>
                  <span className="category-name">{subCategory.name}</span>
                  <span className="note-count">{subCategory.note_count}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
        
        {filteredCategories.length === 0 && !loading && (
          <div className="no-categories">
            <p>No categories found</p>
            {searchTerm && <p>Try a different search term</p>}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="category-picker-loading">
        <div className="spinner"></div>
        <p>Loading categories...</p>
      </div>
    );
  }

  return (
    <div className="category-picker">
      {/* Title Input - show if enabled */}
      {showTitleInput && (
        <div className="note-title-section">
          <label htmlFor="note-title" className="title-label">Note Title (optional)</label>
          <input
            id="note-title"
            type="text"
            placeholder="Enter a title for your note (leave blank for auto-generated title)"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            className="title-input"
            autoFocus
          />
        </div>
      )}
      
      {/* Search */}
      <div className="category-search">
        <input
          type="text"
          placeholder="🔍 Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Category Tree */}
      <div className="category-list">
        {renderCategoryTree()}
      </div>

      {/* Create New Section - Only show if not creating inline */}
      {allowCreateNew && (!showCreateForm || !selectedParentPath) && (
        <div className="create-new-section">
          <button
            className="create-new-btn"
            onClick={() => {
              setShowCreateForm(true);
              setSelectedParentPath(null);
            }}
          >
            + Create Root Category
          </button>
        </div>
      )}

      {/* Root category creation form */}
      {allowCreateNew && showCreateForm && !selectedParentPath && (
        <div className="create-new-section">
          <div className="create-form">
            <div className="create-form-header">
              <h4>Create Root Category</h4>
              <button 
                className="close-form-btn"
                onClick={resetForm}
              >
                ×
              </button>
            </div>
            
            <div
              contentEditable
              suppressContentEditableWarning={true}
              onInput={(e) => {
                const text = (e.target as HTMLDivElement).textContent || '';
                setNewCategoryName(text);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateNew();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  resetForm();
                }
              }}
              onPaste={(e) => {
                e.preventDefault();
                const text = e.clipboardData.getData('text/plain');
                document.execCommand('insertText', false, text);
              }}
              className="category-picker-input"
              data-placeholder={newCategoryName ? '' : 'Category name'}
              ref={(el) => {
                if (el && showCreateForm && !selectedParentPath) {
                  // Auto-focus when the form appears
                  setTimeout(() => el.focus(), 100);
                }
              }}
            />
            
            <div className="create-form-actions">
              <button
                className="create-btn"
                onClick={handleCreateNew}
                disabled={!newCategoryName.trim()}
              >
                Create
              </button>
              <button
                className="cancel-create-btn"
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}