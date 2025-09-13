export interface GraphPosition {
  x: number;
  y: number;
  z_index?: number;
}

export interface GraphViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface GraphNodeData {
  note: any; // Will be properly typed later
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onNodeClick: (nodeId: string) => void;
  onNodeHover: (nodeId: string | null) => void;
  onStartLinking: (nodeId: string, position: { x: number; y: number }) => void;
  isLinkingMode: boolean;
  isLinkingSource: boolean;
  isHovered: boolean;
}