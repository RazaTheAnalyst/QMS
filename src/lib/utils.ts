export function getModeIcon(mode: string): string {
  if (mode.includes('SEA')) return '🚢';
  if (mode === 'Air') return '✈️';
  if (mode === 'Road') return '🚛';
  if (mode === 'Rail') return '🚂';
  if (mode === 'Multi-modal') return '🛣️';
  if (mode === 'Courier') return '📦';
  return '📦';
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}
