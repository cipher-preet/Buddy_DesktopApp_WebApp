export type DocumentTemplate = {
  id: string;
  title: string;
  tagline: string;
  description: string;
  features: string[];
  scopes: Array<{ label: string; detail: string }>;
  exampleSections: Array<{
    heading: string;
    body?: string;
    bullets?: string[];
  }>;
  isNew?: boolean;
};
