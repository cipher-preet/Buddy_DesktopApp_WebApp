export type MindmapTone =
  | 'hub'
  | 'cyan'
  | 'green'
  | 'pink'
  | 'purple'
  | 'yellow'
  | 'blue'
  | 'lavender'
  | 'magenta';

export type MindmapNodeKind = 'hub' | 'branch' | 'card' | 'junction';

export type MindmapCardData = {
  kind: MindmapNodeKind;
  title: string;
  subtitle?: string;
  items?: string[];
  tone?: MindmapTone;
  tags?: string[];
  noteCount?: number;
  variant?: 'default' | 'alert' | 'compact' | 'priority';
  prioritySections?: { label: string; tone: 'high' | 'medium' | 'later'; items: string[] }[];
  edgeHint?: string;
};
