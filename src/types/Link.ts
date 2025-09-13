export interface NoteLink {
  id: string;
  source_id: string;
  target_id: string;
  link_type: LinkType;
  label?: string;
  color?: LinkColor;
  directional?: boolean;
  created_at: string;
}

export type LinkType = 
  | 'Related'
  | 'Reference'
  | 'FollowUp'
  | 'Contradicts'
  | 'Supports'
  | { Custom: string };

export type LinkColor = 'purple' | 'yellow';

export interface LinksDatabase {
  links: NoteLink[];
}