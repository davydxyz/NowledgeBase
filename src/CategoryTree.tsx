import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Category {
  id: string;
  name: string;
  path: string[];
  parent_id?: string;
  note_count: number;
  color?: string;
}

interface CategoryTreeProps {
  onCategorySelect: (categoryPath: string[]) => void;
  selectedCategory: string[] | null;
  onCreateCategory: (name: string, parentPath?: string[]) => void;
  onCategoryDeleted?: () => void;
  onDeleteCategory?: (id: string) => Promise<void>; // Context delete function
  reloadTrigger?: number; // Increment this to trigger category reload
  contextCategories?: Category[]; // Categories from context
}

interface TreeNode {
  category: Category;
  children: TreeNode[];
  isExpanded: boolean;
}

export function CategoryTree({ onCategorySelect, selectedCategory, onCategoryDeleted, onDeleteCategory, reloadTrigger, contextCategories }: CategoryTreeProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState<string | null>(null); // category ID to create under
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showRenameForm, setShowRenameForm] = useState<string | null>(null); // category ID to rename
  const [renameValue, setRenameValue] = useState("");
  const [showContextMenu, setShowContextMenu] = useState<{categoryId: string, x: number, y: number} | null>(null);
  const [debugMessage, setDebugMessage] = useState<string>("");

  // Only load categories initially if no context categories provided
  useEffect(() => {
    if (!contextCategories) {
      loadCategories();
    }
  }, []);

  // Always sync with context categories when available
  useEffect(() => {
    if (contextCategories) {
      console.log('📊 CategoryTree: Syncing with context categories:', contextCategories.length, contextCategories.map(c => ({id: c.id, name: c.name, count: c.note_count})));
      setCategories(contextCategories);
    }
  }, [contextCategories]);

  // Fallback: Reload categories when reloadTrigger changes (only if no context)
  useEffect(() => {
    if (!contextCategories && reloadTrigger !== undefined && reloadTrigger > 0) {
      console.log('📊 CategoryTree: Reloading categories due to trigger change:', reloadTrigger);
      loadCategories();
    }
  }, [reloadTrigger, contextCategories]);

  const loadCategories = async () => {
    try {
      const result = await invoke<Category[]>("get_categories");
      console.log("📁 Loaded categories:", result);
      setCategories(result);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const buildTree = useCallback((categories: Category[]): TreeNode[] => {
    const categoryMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    console.log("🌳 Building tree from categories:", categories.map(c => ({ 
      name: c.name, 
      path: c.path, 
      parent_id: c.parent_id 
    })));

    // Create nodes for all categories
    categories.forEach(category => {
      categoryMap.set(category.id, {
        category,
        children: [],
        isExpanded: expandedNodes.has(category.path.join("/"))
      });
    });

    // Build the tree structure
    categories.forEach(category => {
      const node = categoryMap.get(category.id)!;
      
      if (category.parent_id) {
        const parent = categoryMap.get(category.parent_id);
        if (parent) {
          console.log(`🔗 Adding ${category.name} as child of ${parent.category.name}`);
          parent.children.push(node);
        } else {
          console.log(`⚠️ Parent not found for ${category.name}, parent_id: ${category.parent_id}`);
          rootNodes.push(node);
        }
      } else {
        console.log(`🌟 Adding ${category.name} as root node`);
        rootNodes.push(node);
      }
    });

    // Sort children by name
    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => a.category.name.localeCompare(b.category.name));
      nodes.forEach(node => sortNodes(node.children));
    };
    
    sortNodes(rootNodes);
    return rootNodes;
  }, [expandedNodes]);

  useEffect(() => {
    if (categories.length > 0) {
      const tree = buildTree(categories);
      setTreeNodes(tree);
    } else {
      setTreeNodes([]);
    }
  }, [categories, buildTree]);

  const toggleExpanded = (categoryPath: string[]) => {
    const pathKey = categoryPath.join("/");
    const newExpanded = new Set(expandedNodes);
    
    if (expandedNodes.has(pathKey)) {
      newExpanded.delete(pathKey);
    } else {
      newExpanded.add(pathKey);
    }
    
    setExpandedNodes(newExpanded);
  };

  const handleCreateCategory = async (parentPath?: string[]) => {
    if (!newCategoryName.trim()) return;

    setDebugMessage(`Creating subcategory "${newCategoryName}" under: ${parentPath?.join(' → ') || 'root'}`);

    try {
      await invoke("create_category", { 
        name: newCategoryName.trim(), 
        parentPath: parentPath 
      });
      setDebugMessage(`Successfully created subcategory: ${newCategoryName}`);
      setNewCategoryName("");
      setShowCreateForm(null);
      
      // If we have context categories, trigger reload in parent component
      if (contextCategories) {
        onCategoryDeleted?.(); // This will trigger parent to reload
      } else {
        // Fallback: reload locally
        loadCategories();
      }
      
      setTimeout(() => {
        setDebugMessage("");
      }, 2000);
    } catch (error) {
      setDebugMessage(`Failed to create category: ${error}`);
      console.error("Failed to create category:", error);
    }
  };

  const handleRenameCategory = async (categoryId: string) => {
    if (!renameValue.trim()) return;
    
    const category = categories.find(c => c.id === categoryId);
    setDebugMessage(`Renaming "${category?.name}" to "${renameValue}"`);

    try {
      await invoke("rename_category", {
        categoryId: categoryId,
        newName: renameValue.trim()
      });
      setDebugMessage(`Successfully renamed to: ${renameValue}`);
      setRenameValue("");
      setShowRenameForm(null);
      loadCategories();
      
      setTimeout(() => {
        setDebugMessage("");
      }, 2000);
    } catch (error) {
      setDebugMessage(`Failed to rename category: ${error}`);
      console.error("Failed to rename category:", error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    // Use both local categories and context categories to find the category
    const allCategories = contextCategories || categories;
    const category = allCategories.find(c => c.id === categoryId);
    
    if (!category) {
      setDebugMessage(`Error: Category with ID ${categoryId} not found`);
      console.error("🗑️ Category not found:", categoryId);
      console.error("🗑️ Available in local state:", categories.map(c => ({ id: c.id, name: c.name })));
      console.error("🗑️ Available in context:", contextCategories?.map(c => ({ id: c.id, name: c.name })));
      return;
    }

    setDebugMessage(`Deleting category: ${category.name} (ID: ${categoryId})`);
    setShowContextMenu(null);

    try {
      // Always prefer context delete function for proper sync
      if (onDeleteCategory) {
        await onDeleteCategory(categoryId);
        setDebugMessage(`Successfully deleted category: ${category.name}`);
        onCategoryDeleted?.();
      } else {
        // Fallback to direct invoke (legacy path)
        await invoke("delete_category", { categoryId: categoryId });
        setDebugMessage(`Successfully deleted category: ${category.name}`);
        await loadCategories();
        onCategoryDeleted?.();
      }
      
      setTimeout(() => {
        setDebugMessage("");
      }, 3000);
    } catch (error) {
      setDebugMessage(`Failed to delete category "${category.name}": ${error}`);
      console.error("🗑️ Failed to delete category:", error);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, categoryId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu({
      categoryId,
      x: e.clientX,
      y: e.clientY
    });
  };

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(null);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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

  const renderNode = (node: TreeNode, depth: number = 0): JSX.Element => {
    const isSelected = selectedCategory && 
      selectedCategory.length === node.category.path.length &&
      selectedCategory.every((item, index) => item === node.category.path[index]);

    const hasChildren = node.children.length > 0;
    const pathKey = node.category.path.join("/");
    const isExpanded = expandedNodes.has(pathKey);

    return (
      <div key={node.category.id} className="category-node">
        <div 
          className={`category-item ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onContextMenu={(e) => handleContextMenu(e, node.category.id)}
        >
          <div className="category-content" onClick={() => onCategorySelect(node.category.path)}>
            {hasChildren && (
              <button 
                className={`expand-btn ${isExpanded ? 'expanded' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(node.category.path);
                }}
              >
                ▶
              </button>
            )}
            {!hasChildren && <span className="expand-spacer"></span>}
            
            <span 
              className="category-icon"
              style={{ backgroundColor: getCategoryColor(node.category.path) }}
            >
              {getCategoryIcon(node.category.path)}
            </span>
            
            {showRenameForm === node.category.id ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameCategory(node.category.id);
                  } else if (e.key === 'Escape') {
                    setShowRenameForm(null);
                    setRenameValue("");
                  }
                }}
                onBlur={() => {
                  setShowRenameForm(null);
                  setRenameValue("");
                }}
                autoFocus
                className="rename-input"
              />
            ) : (
              <span className="category-name">{node.category.name}</span>
            )}
            
            {node.category.note_count > 0 && (
              <span className="note-count">{node.category.note_count}</span>
            )}
          </div>
          
        </div>

        {showCreateForm === node.category.id && (
          <div className="create-form" style={{ paddingLeft: `${(depth + 1) * 20 + 12}px` }}>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateCategory(node.category.path);
                } else if (e.key === 'Escape') {
                  setShowCreateForm(null);
                  setNewCategoryName("");
                }
              }}
            />
            <div className="create-form-buttons">
              <button 
                className="inline-save-btn"
                onClick={() => handleCreateCategory(node.category.path)}
              >
                ✓
              </button>
              <button 
                className="inline-cancel-btn"
                onClick={() => {
                  setShowCreateForm(null);
                  setNewCategoryName("");
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {isExpanded && node.children.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="category-tree">
      <div className="category-header">
        <h3>Categories</h3>
        <button 
          className="add-root-category-btn"
          onClick={() => setShowCreateForm('root')}
          title="Add new category"
        >
          +
        </button>
      </div>

      {debugMessage && (
        <div className="debug-message" style={{ 
          padding: '8px', 
          margin: '8px 0', 
          background: '#e3f2fd', 
          border: '1px solid #2196f3', 
          borderRadius: '4px', 
          fontSize: '12px',
          color: '#1976d2'
        }}>
          {debugMessage}
        </div>
      )}

      {showCreateForm === 'root' && (
        <div className="create-form root-form">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Category name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateCategory();
              } else if (e.key === 'Escape') {
                setShowCreateForm(null);
                setNewCategoryName("");
              }
            }}
          />
          <div className="create-form-buttons">
            <button 
              className="inline-save-btn"
              onClick={() => handleCreateCategory()}
            >
              ✓
            </button>
            <button 
              className="inline-cancel-btn"
              onClick={() => {
                setShowCreateForm(null);
                setNewCategoryName("");
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="category-list">
        {treeNodes.map(node => renderNode(node))}
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <div 
          className="context-menu"
          style={{
            position: 'fixed',
            left: showContextMenu.x,
            top: showContextMenu.y,
            zIndex: 1000
          }}
        >
          <button 
            className="context-menu-item"
            onClick={() => {
              const category = categories.find(c => c.id === showContextMenu.categoryId);
              if (category) {
                setRenameValue(category.name);
                setShowRenameForm(category.id);
                setShowContextMenu(null);
              }
            }}
          >
            ✏️ Rename
          </button>
          <button 
            className="context-menu-item"
            onClick={() => {
              setShowCreateForm(showContextMenu.categoryId);
              setShowContextMenu(null);
            }}
          >
            📁 Add Subcategory
          </button>
          <button 
            className="context-menu-item delete"
            onClick={() => {
              handleDeleteCategory(showContextMenu.categoryId);
            }}
          >
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  );
}