export const designs = [
  { id: 1, label: 'Design 1', description: 'Current website' },
  { id: 2, label: 'Design 2', description: 'Artifact: split hero and quote form' },
  { id: 3, label: 'Design 3', description: 'Artifact: centered hero and wide quote form' },
  { id: 4, label: 'Design 4', description: 'Main branch website' },
] as const;
export type DesignId = typeof designs[number]['id'];
export function readDesign(value: string | null): DesignId {
  return designs.find(design => String(design.id) === value)?.id || 1;
}
