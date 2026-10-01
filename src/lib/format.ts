import { useState, useEffect } from 'react';

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

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

type AuthUserLike = { email?: string; user_metadata?: Record<string, unknown> } | null | undefined;

export function titleCaseName(value: string): string {
  return value
    .replace(/[._-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
}

export function displayName(value?: string): string {
  if (!value) return '-';
  const emailName = value.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
  return emailName ? emailName.replace(/\b\w/g, char => char.toUpperCase()) : value;
}

export function getUserName(user: AuthUserLike, fallback = 'Unknown user'): string {
  const metadata = user?.user_metadata ?? {};
  const metadataName = metadata.full_name || metadata.name || metadata.display_name;
  if (typeof metadataName === 'string' && metadataName.trim()) {
    return metadataName.trim();
  }
  const emailName = user?.email?.split('@')[0] ?? '';
  return emailName ? titleCaseName(emailName) : fallback;
}