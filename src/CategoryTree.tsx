import { useState, useEffect } from "react";
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
  reloadTrigger?: number; // Increment this to trigger category reload
}

interface TreeNode {
  category: Category;
  children: TreeNode[];
  isExpanded: boolean;
}

export function CategoryTree({ onCategorySelect, selectedCategory, onCategoryDeleted, reloadTrigger }: CategoryTreeProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["Ideas", "Technical", "Learning", "Personal"]));
  const [showCreateForm, setShowCreateForm] = useState<string | null>(null); // category ID to create under
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showRenameForm, setShowRenameForm] = useState<string | null>(null); // category ID to rename
  const [renameValue, setRenameValue] = useState("");
  const [showContextMenu, setShowContextMenu] = useState<{categoryId: string, x: number, y: number} | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  // Reload categories when reloadTrigger changes
  useEffect(() => {
    if (reloadTrigger !== undefined && reloadTrigger > 0) {
      console.log('📊 CategoryTree: Reloading categories due to trigger change:', reloadTrigger);
      loadCategories();
    }
  }, [reloadTrigger]);

  useEffect(() => {
    if (categories.length > 0) {
      const tree = buildTree(categories);
      setTreeNodes(tree);
    }
  }, [categories, expandedNodes]);

  const loadCategories = async () => {
    try {
      const result = await invoke<Category[]>("get_categories");
      setCategories(result);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const buildTree = (categories: Category[]): TreeNode[] => {
    const categoryMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

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
          parent.children.push(node);
        }
      } else {
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
  };

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

    try {
      await invoke("create_category", { 
        name: newCategoryName.trim(), 
        parentPath 
      });
      setNewCategoryName("");
      setShowCreateForm(null);
      loadCategories();
    } catch (error) {
      console.error("Failed to create category:", error);
    }
  };

  const handleRenameCategory = async (categoryId: string) => {
    if (!renameValue.trim()) return;

    try {
      await invoke("rename_category", {
        categoryId,
        newName: renameValue.trim()
      });
      setRenameValue("");
      setShowRenameForm(null);
      loadCategories();
    } catch (error) {
      console.error("Failed to rename category:", error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    console.log("🗑️ Deleting category:", categoryId);
    console.log("🗑️ handleDeleteCategory called");

    try {
      await invoke("delete_category", { categoryId });
      console.log("🗑️ Category deleted successfully");
      loadCategories();
      setShowContextMenu(null);
      
      // Give some time for the backend to complete, then reload categories
      setTimeout(() => {
        loadCategories();
        // Notify parent to reload notes too
        onCategoryDeleted?.();
      }, 200);
    } catch (error) {
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
              style={{ backgroundColor: node.category.color || '#6c757d' }}
            >
              📁
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
          
          <button 
            className="add-subcategory-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowCreateForm(node.category.id);
            }}
            title="Add subcategory"
          >
            +
          </button>
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
            className="context-menu-item delete"
            onClick={() => handleDeleteCategory(showContextMenu.categoryId)}
          >
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  );
}