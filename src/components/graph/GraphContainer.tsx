import { useCallback, useEffect, useState, useRef } from 'react';
import { ApiService } from '../../services/api';
import { useAppData } from '../../contexts/AppDataContext';
import ReactFlow, {
  Node,
  useNodesState,
  useEdgesState,
  Connection,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  NodeChange,
  OnNodesChange,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Note, NoteLink, LinkColor } from '../../types';
import { GraphNode } from './GraphNode';
import { LinkCreationModal } from './LinkCreationModal';
import { LinkEditModal } from './LinkEditModal';

interface GraphContainerProps {
  notes: Note[];
  selectedCategory: string[] | null;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReload: () => Promise<void>;
}

const nodeTypes = {
  noteNode: GraphNode,
};

export function GraphContainer({ 
  notes, 
  selectedCategory, 
  onEdit, 
  onDelete, 
  onReload: _onReload 
}: GraphContainerProps) {
  const { data, createLink, deleteLink, setGraphViewport } = useAppData();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  // Linking state
  const [isLinkingMode, setIsLinkingMode] = useState(false);
  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkTarget, setLinkTarget] = useState<{ id: string; title: string } | null>(null);
  const [editingLink, setEditingLink] = useState<any | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [sourceNodePosition, setSourceNodePosition] = useState<{ x: number; y: number } | null>(null);
  const [isLocked] = useState<boolean>(false);

  const saveTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // We'll handle viewport saving with a reference to ReactFlow instance
  const reactFlowRef = useRef<any>(null);

  // Filter notes based on selected category
  const filteredNotes = selectedCategory 
    ? notes.filter(note => 
        note.category_path.length >= selectedCategory.length &&
        selectedCategory.every((cat, index) => note.category_path[index] === cat)
      )
    : notes;

  // Simple delete wrapper - no debug output
  const handleDelete = async (id: string) => {
    try {
      await onDelete(id);
      // Force a small delay then refresh layout
      setTimeout(() => {
        initializeLayout();
      }, 100);
    } catch (error) {
      console.error('Delete failed:', error);
      throw error;
    }
  };

  // Load and render links as edges
  const loadLinks = useCallback(() => {
    try {
      const links: NoteLink[] = data.links;
      console.log('🔗 RAW LINKS FROM DATA:', links);
      
      // Filter links to only include those between visible notes
      const visibleNoteIds = new Set(filteredNotes.map(note => note.id));
      const visibleLinks = links.filter(link => 
        visibleNoteIds.has(link.source_id) && visibleNoteIds.has(link.target_id)
      );
      
      // Group links by node pairs to handle multiple links between same nodes
      const linkGroups = new Map<string, NoteLink[]>();
      visibleLinks.forEach(link => {
        // Create a consistent key for both directions
        const nodeA = link.source_id < link.target_id ? link.source_id : link.target_id;
        const nodeB = link.source_id < link.target_id ? link.target_id : link.source_id;
        const key = `${nodeA}-${nodeB}`;
        
        if (!linkGroups.has(key)) {
          linkGroups.set(key, []);
        }
        linkGroups.get(key)!.push(link);
      });

      // Convert links to React Flow edges with curves for multiple links
      const newEdges = Array.from(linkGroups.values()).flatMap(linkGroup => {
        return linkGroup.map((link, index) => {
          // Curve strategy: first=straight, second=curve up, third=curve down
          let edgeType = 'smoothstep';
          
          if (linkGroup.length > 1) {
            switch (index) {
              case 0:
                // First link: straight
                edgeType = 'straight';
                break;
              case 1:
                // Second link: curve with bezier
                edgeType = 'default';
                break;
              case 2:
                // Third link: curve with bezier (opposite direction)
                edgeType = 'step';
                break;
              default:
                // Additional links: alternate smoothstep
                edgeType = 'smoothstep';
                break;
            }
          }
          
          const color = getLinkColor(link);
          const isDirectional = isDirectionalLink(link);
          console.log(`🎨 CREATING EDGE: id=${link.id}, type=${link.link_type}, color=${color}, directional=${isDirectional}`);
          if (isDirectional) {
            console.log(`🏹 ARROW SHOULD SHOW for ${link.link_type} link`);
          }
          
          return {
            id: link.id,
            source: link.source_id,
            target: link.target_id,
            type: edgeType,
            animated: false,
            style: {
              stroke: color,
              strokeWidth: 2,
              cursor: 'pointer',
            },
            markerEnd: isDirectional ? {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: color,
            } : undefined,
            sourcePosition: 'right',
            targetPosition: 'left',
            label: link.label || getLinkTypeLabel(link.link_type),
            labelStyle: { 
              fontSize: 12, 
              fontWeight: 500,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              padding: '2px 4px',
              borderRadius: '3px',
            },
            data: { link, linkIndex: index },
            selectable: true,
            focusable: true,
          };
        });
      });
      
      setEdges(newEdges);
    } catch (error) {
      console.error('Failed to load links:', error);
    }
  }, [data.links, filteredNotes, setEdges]);


  // Get link color based on type and custom color
  const getLinkColor = (link: any) => {
    console.log('🎨 GET_LINK_COLOR called with link:', link);
    
    // Use custom color if available
    if (link.color) {
      const colorValue = typeof link.color === 'string' ? link.color.toLowerCase() : link.color;
      console.log('🎨 Link has custom color:', colorValue);
      switch (colorValue) {
        case 'purple': 
          console.log('🟣 Returning purple');
          return '#8b5cf6';
        case 'yellow': 
          console.log('🟡 Returning yellow');
          return '#eab308';
        default: 
          console.log('🟣 Default to purple for unknown color:', colorValue);
          return '#8b5cf6'; // default to purple
      }
    }
    
    // Fallback to type-based colors for backward compatibility
    const linkType = link.link_type || link;
    console.log('🎨 Using type-based color for:', linkType);
    if (typeof linkType === 'string') {
      switch (linkType) {
        case 'Related': return '#6b7280'; // gray for bidirectional
        case 'Reference': return '#3b82f6';
        case 'FollowUp': return '#10b981';
        case 'Contradicts': return '#ef4444';
        case 'Supports': return '#f59e0b'; // orange/amber
        default: return '#8b5cf6';
      }
    }
    console.log('🟣 Final fallback to purple');
    return '#8b5cf6'; // Default to purple
  };

  // Get link type label
  const getLinkTypeLabel = (linkType: any) => {
    if (typeof linkType === 'string') {
      return linkType;
    }
    return linkType.Custom || 'Custom';
  };

  // Determine if a link is directional
  const isDirectionalLink = (link: any) => {
    console.log('🔄 IS_DIRECTIONAL_LINK called with link:', link);
    
    // Use custom directional setting if available
    if (link.directional !== undefined) {
      console.log('🔄 Link has custom directional:', link.directional);
      return link.directional;
    }
    
    // Fallback to type-based directionality for backward compatibility
    const linkType = link.link_type || link;
    console.log('🔄 Checking linkType:', linkType, 'typeof:', typeof linkType);
    if (typeof linkType === 'string') {
      switch (linkType) {
        case 'Reference': // A references B (A → B)
        case 'FollowUp':  // A follows up from B (A → B) 
        case 'Supports':  // A supports B (A → B)
          console.log('🔄 ✅ DIRECTIONAL link type:', linkType);
          return true;
        case 'Related':   // Bidirectional relationship (A ↔ B)
        case 'Contradicts': // A contradicts B (A ↔ B) - bidirectional
        default:
          console.log('🔄 ❌ BIDIRECTIONAL link type:', linkType);
          return false;
      }
    } else if (linkType && typeof linkType === 'object') {
      // Handle enum case from Rust backend
      console.log('🔄 Object linkType detected:', Object.keys(linkType));
      if (linkType.Reference || linkType.FollowUp || linkType.Supports) {
        console.log('🔄 ✅ DIRECTIONAL object link type');
        return true;
      }
    }
    console.log('🔄 Default to bidirectional for unknown type');
    return false; // Default to bidirectional
  };

  // Handle link button click to start linking mode
  const handleStartLinking = useCallback((nodeId: string, nodePosition: { x: number; y: number }) => {
    // Use the screen position provided by the button click event
    setSourceNodePosition({
      x: nodePosition.x,
      y: nodePosition.y
    });
    
    setIsLinkingMode(true);
    setLinkingSourceId(nodeId);
  }, []);

  // Handle node click for both linking and normal editing
  const handleNodeClick = useCallback((nodeId: string) => {
    if (isLinkingMode && linkingSourceId) {
      // LINKING MODE: Handle link creation
      if (linkingSourceId === nodeId) {
        // Clicked same node - cancel linking
        setIsLinkingMode(false);
        setLinkingSourceId(null);
        setSourceNodePosition(null);
        setHoveredNodeId(null);
      } else {
        // Clicked different node - create link
        const targetNote = filteredNotes.find(note => note.id === nodeId);
        
        if (targetNote) {
          setLinkTarget({ id: nodeId, title: targetNote.title });
          setShowLinkModal(true);
        }
      }
    } else {
      // NORMAL MODE: Handle note editing - let the GraphNode component handle this
      // This allows normal note click functionality to work
      console.log('Normal note click:', nodeId);
      // Note: The actual edit modal should be handled by the GraphNode component
    }
  }, [isLinkingMode, linkingSourceId, filteredNotes]);

  // Handle mouse move for drawing temporary link line
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (isLinkingMode && linkingSourceId) {
      const rect = event.currentTarget.getBoundingClientRect();
      setMousePosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    }
  }, [isLinkingMode, linkingSourceId]);

  // Cancel link creation/editing
  const handleCancelLink = useCallback(() => {
    setIsLinkingMode(false);
    setLinkingSourceId(null);
    setShowLinkModal(false);
    setLinkTarget(null);
    setEditingLink(null);
    setSourceNodePosition(null);
    setHoveredNodeId(null);
  }, []);

  // Delete existing link
  const handleDeleteLink = useCallback(async () => {
    if (!editingLink) return;

    try {
      await deleteLink(editingLink.id);
      handleCancelLink();
    } catch (error) {
      console.error('Failed to delete link:', error);
    }
  }, [editingLink, deleteLink, handleCancelLink]);

  // Handle node hover for linking
  const handleNodeHover = useCallback((nodeId: string | null) => {
    if (isLinkingMode && linkingSourceId && nodeId && nodeId !== linkingSourceId) {
      setHoveredNodeId(nodeId);
    } else {
      setHoveredNodeId(null);
    }
  }, [isLinkingMode, linkingSourceId]);

  // Create link
  const handleCreateLink = useCallback(async (linkType: string, label?: string, color?: LinkColor, directional?: boolean) => {
    if (!linkingSourceId || !linkTarget) {
      return;
    }

    try {
      // Create the link with additional properties
      await createLink(linkingSourceId, linkTarget.id, linkType, label, color, directional);
      
      console.log(`Created link with color: ${color}, directional: ${directional}`);

      // Reset linking state
      setIsLinkingMode(false);
      setLinkingSourceId(null);
      setShowLinkModal(false);
      setLinkTarget(null);
      setSourceNodePosition(null);
      setHoveredNodeId(null);

    } catch (error) {
      console.error('Failed to create link:', error);
    }
  }, [linkingSourceId, linkTarget, createLink]);



  // Handle connecting nodes by dragging
  const onConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target && connection.source !== connection.target) {
      const sourceNote = filteredNotes.find(n => n.id === connection.source);
      const targetNote = filteredNotes.find(n => n.id === connection.target);
      
      if (sourceNote && targetNote) {
        setLinkingSourceId(connection.source);
        setLinkTarget({ id: connection.target, title: targetNote.title });
        setEditingLink(null); // This is for creating a new link
        setShowLinkModal(true);
      }
    }
  }, [filteredNotes]);

  // Update existing link
  const handleUpdateLink = useCallback(async (linkType: string, label?: string, color?: LinkColor, directional?: boolean) => {
    if (!editingLink) return;

    try {
      console.log(`Updating link with color: ${color}, directional: ${directional}`);
      // Delete old link and create new one with updated properties
      await deleteLink(editingLink.id);
      await createLink(editingLink.source_id, editingLink.target_id, linkType, label, color, directional);
      
      // Reset state
      setShowLinkModal(false);
      setEditingLink(null);
      setLinkingSourceId(null);
      setLinkTarget(null);

      // Links will auto-update via context
    } catch (error) {
      console.error('Failed to update link:', error);
      alert(`Failed to update link: ${error}`);
    }
  }, [editingLink, deleteLink, createLink]);

  // Initialize graph layout
  const initializeLayout = useCallback(async () => {
    if (filteredNotes.length === 0) {
      setNodes([]);
      setIsInitialized(true);
      return;
    }

    try {
      // Get existing positions from backend
      const positions: [string, { x: number, y: number, z_index?: number }][] = 
        await ApiService.getAllNotePositions();
      
      const positionMap = new Map(positions);
      
      // Create nodes with positions
      const newNodes: Node[] = filteredNotes.map((note, index) => {
        const existingPosition = positionMap.get(note.id);
        
        // Use existing position or generate new one
        const position = existingPosition 
          ? { x: existingPosition.x, y: existingPosition.y }
          : generateInitialPosition(index, filteredNotes.length);

        return {
          id: note.id,
          type: 'noteNode',
          position,
          data: { 
            note,
            onEdit,
            onDelete: handleDelete,
            onNodeClick: handleNodeClick,
            onNodeHover: handleNodeHover,
            onStartLinking: handleStartLinking,
            isLinkingMode: false, // Always start with false, will be updated by useEffect
            isLinkingSource: false,
            isHovered: false,
            isLocked: isLocked,
          },
          draggable: !isLocked,
        };
      });

      setNodes(newNodes);
      setIsInitialized(true);
    } catch (error) {
      
      // Fallback: create nodes with default positions
      const newNodes: Node[] = filteredNotes.map((note, index) => ({
        id: note.id,
        type: 'noteNode',
        position: generateInitialPosition(index, filteredNotes.length),
        data: { 
          note,
          onEdit,
          onDelete: handleDelete,
          onNodeClick: handleNodeClick,
          onNodeHover: handleNodeHover,
          onStartLinking: handleStartLinking,
          isLinkingMode: false, // Always start with false, will be updated by useEffect
          isLinkingSource: false,
          isHovered: false,
          isLocked: isLocked,
        },
        draggable: !isLocked,
      }));

      setNodes(newNodes);
      setIsInitialized(true);
    }
  }, [filteredNotes, onEdit, onDelete]);

  // Generate initial position for notes without saved positions
  const generateInitialPosition = (index: number, total: number) => {
    // Create a simple grid layout with more spacing
    const cols = Math.ceil(Math.sqrt(total));
    const row = Math.floor(index / cols);
    const col = index % cols;
    
    return {
      x: col * 400 + 150,
      y: row * 300 + 150,
    };
  };

  // Save node position when dragging ends
  const handleNodesChange: OnNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    
    // Handle position changes with timeout-based saving
    changes.forEach((change) => {
      if (change.type === 'position' && change.position) {
        // Clear existing timeout for this node
        const existingTimeout = saveTimeoutRef.current.get(change.id);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }
        
        // If dragging, set a new timeout to save after drag stops
        if (change.dragging === true) {
          const newTimeout = setTimeout(async () => {
            try {
              await ApiService.saveNotePosition(change.id, change.position!.x, change.position!.y);
              saveTimeoutRef.current.delete(change.id);
            } catch (error) {
              console.error('Position save failed:', error);
            }
          }, 500); // Save 500ms after last drag event
          
          saveTimeoutRef.current.set(change.id, newTimeout);
        }
        // Also save immediately if we get a dragging=false event
        else if (change.dragging === false && change.position) {
          // Clear any pending timeout since we're saving now
          if (existingTimeout) {
            clearTimeout(existingTimeout);
            saveTimeoutRef.current.delete(change.id);
          }
          
          // Save immediately
          setTimeout(async () => {
            try {
              await ApiService.saveNotePosition(change.id, change.position!.x, change.position!.y);
            } catch (error) {
              console.error('Position save failed:', error);
            }
          }, 0);
        }
      }
    });
  }, [onNodesChange]);

  // Handle edge click for editing/deleting links  
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: any) => {
    event.stopPropagation();
    
    // Find the source and target notes
    const sourceNote = filteredNotes.find(note => note.id === edge.source);
    const targetNote = filteredNotes.find(note => note.id === edge.target);
    
    if (!sourceNote || !targetNote) {
      return;
    }
    
    if (!edge.data?.link) {
      return;
    }
    
    setLinkingSourceId(edge.source);
    setLinkTarget({ id: edge.target, title: targetNote.title });
    setEditingLink(edge.data.link);
    setShowLinkModal(true);
  }, [filteredNotes]);


  // Auto-layout function
  const applyAutoLayout = useCallback(async () => {
    if (nodes.length === 0) return;

    // Simple force-directed layout algorithm with larger canvas area
    const centerX = 600;
    const centerY = 400;
    const radius = Math.min(400, 100 + nodes.length * 20);

    const newNodes = nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / nodes.length;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      return {
        ...node,
        position: { x, y },
      };
    });

    setNodes(newNodes);

    // Save all new positions
    for (const node of newNodes) {
      try {
        await ApiService.saveNotePosition(node.id, node.position.x, node.position.y);
      } catch (error) {
        console.error('Failed to save position for node:', node.id, error);
      }
    }
  }, [nodes, setNodes]);

  // Initialize layout when component first loads or when notes are actually added/removed
  useEffect(() => {
    if (!isInitialized) {
      initializeLayout();
    }
  }, [isInitialized, initializeLayout]);

  // Handle when notes are actually added or removed (not just filtered)
  useEffect(() => {
    if (isInitialized && nodes.length > 0 && nodes.length !== filteredNotes.length) {
      initializeLayout();
    }
  }, [filteredNotes.length, isInitialized, nodes.length, initializeLayout]);

  // Load links when notes are initialized or data changes
  useEffect(() => {
    if (isInitialized && filteredNotes.length > 0) {
      loadLinks();
    }
  }, [isInitialized, filteredNotes, loadLinks, data.links]);

  // Update node data when notes content changes
  useEffect(() => {
    if (isInitialized && filteredNotes.length > 0) {
      setNodes(currentNodes => 
        currentNodes.map(node => {
          // Find the updated note data for this node
          const updatedNote = filteredNotes.find(note => note.id === node.id);
          if (updatedNote) {
            return {
              ...node,
              data: {
                ...node.data,
                note: updatedNote, // Update with fresh note data
              }
            };
          }
          return node;
        })
      );
    }
  }, [filteredNotes, isInitialized, setNodes]);

  // Update nodes when linking state changes
  useEffect(() => {
    if (isInitialized && filteredNotes.length > 0) {
      setNodes(currentNodes => 
        currentNodes.map(node => ({
          ...node,
          draggable: !isLocked,
          data: {
            ...node.data,
            isLinkingMode,
            isLinkingSource: linkingSourceId === node.id,
            isHovered: hoveredNodeId === node.id,
            isLocked: isLocked,
            // Pass fresh callback references with current state
            onNodeClick: handleNodeClick,
            onNodeHover: handleNodeHover,
            onStartLinking: handleStartLinking,
          }
        }))
      );
    }
  }, [isLinkingMode, linkingSourceId, hoveredNodeId, isLocked, isInitialized, filteredNotes.length, setNodes, handleNodeClick, handleNodeHover, handleStartLinking]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      // Clear all pending save timeouts
      saveTimeoutRef.current.forEach((timeout) => {
        clearTimeout(timeout);
      });
      saveTimeoutRef.current.clear();
    };
  }, []);

  if (!isInitialized) {
    return (
      <div className="graph-loading">
        <div>Loading graph...</div>
      </div>
    );
  }

  return (
    <div className="graph-container">
      <div className="graph-controls">
        <button onClick={applyAutoLayout} className="graph-control-btn">
          🔄 Auto Layout
        </button>
        {isLinkingMode && (
          <button 
            onClick={handleCancelLink} 
            className="graph-control-btn cancel-linking"
          >
            ✕ Cancel Linking
          </button>
        )}
        {selectedCategory && (
          <div className="graph-filter-info">
            Showing: {selectedCategory.join(' → ')}
          </div>
        )}
      </div>
      
      <div 
        className="react-flow-wrapper"
        onMouseMove={handleMouseMove}
      >
        <ReactFlow
          ref={reactFlowRef}
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onEdgeMouseEnter={() => {}}
          nodeTypes={nodeTypes}
          fitView={false}
          defaultViewport={data.uiState.graphViewport}
          onMoveEnd={(_event, viewport) => {
            // Save viewport changes when pan/zoom ends
            setGraphViewport(viewport);
          }}
          minZoom={0.1}
          maxZoom={3}
          translateExtent={[[-2000, -2000], [4000, 4000]]}
          nodeExtent={[[-2000, -2000], [4000, 4000]]}
          elementsSelectable={!isLocked}
          edgesUpdatable={!isLocked}
          edgesFocusable={!isLocked}
          selectNodesOnDrag={false}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={false}
          multiSelectionKeyCode={null}
          nodesDraggable={!isLocked}
        >
        <Controls />
        <MiniMap 
          zoomable 
          pannable 
          style={{
            backgroundColor: '#f8f9fa',
          }}
        />
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1}
          color="#e1e5e9"
        />
      </ReactFlow>
      
      {/* Temporary linking line */}
      {isLinkingMode && linkingSourceId && sourceNodePosition && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#10b981"
                opacity="0.9"
              />
            </marker>
          </defs>
          <line
            x1={sourceNodePosition.x}
            y1={sourceNodePosition.y}
            x2={mousePosition.x}
            y2={mousePosition.y}
            stroke="#10b981"
            strokeWidth="3"
            strokeDasharray="8,4"
            opacity="0.9"
            markerEnd="url(#arrowhead)"
          />
          {/* Source indicator circle */}
          <circle
            cx={sourceNodePosition.x}
            cy={sourceNodePosition.y}
            r="5"
            fill="#10b981"
            opacity="0.8"
          />
        </svg>
      )}
      </div>
      
      {/* Link Creation/Edit Modal */}
      {showLinkModal && linkingSourceId && linkTarget && (
        editingLink ? (
          <LinkEditModal
            isOpen={showLinkModal}
            sourceNoteTitle={filteredNotes.find(n => n.id === linkingSourceId)?.title || 'Unknown'}
            targetNoteTitle={linkTarget.title}
            currentLink={editingLink}
            onUpdate={handleUpdateLink}
            onDelete={handleDeleteLink}
            onCancel={handleCancelLink}
          />
        ) : (
          <LinkCreationModal
            isOpen={showLinkModal}
            sourceNoteTitle={filteredNotes.find(n => n.id === linkingSourceId)?.title || 'Unknown'}
            targetNoteTitle={linkTarget.title}
            onConfirm={handleCreateLink}
            onCancel={handleCancelLink}
          />
        )
      )}
    </div>
  );
}