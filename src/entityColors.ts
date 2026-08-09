export const ENTITY_COLORS: Record<string, { main: string; gradient: string }> = {
  UAE: { main: '#7c3aed', gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)' },
  Qatar: { main: '#2563eb', gradient: 'linear-gradient(135deg, #2563eb, #60a5fa)' },
  Oman: { main: '#059669', gradient: 'linear-gradient(135deg, #059669, #34d399)' },
};

export function getEntityColor(entity: string): { main: string; gradient: string } {
  return ENTITY_COLORS[entity] || ENTITY_COLORS['UAE']!;
}
