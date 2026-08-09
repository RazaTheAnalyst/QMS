export interface StatusStyle {
  color: string;
  bg: string;
  darkBg: string;
}

export const STATUS_COLORS: Record<string, StatusStyle> = {
  'Awaiting Approval': { color: '#d97706', bg: '#fef3c7', darkBg: 'rgba(217,119,6,0.16)' },
  'Rejected': { color: '#dc2626', bg: '#fef2f2', darkBg: 'rgba(220,38,38,0.16)' },
  'Pending': { color: '#f59e0b', bg: '#fffbeb', darkBg: 'rgba(245,158,11,0.16)' },
  'Sent for quotation': { color: '#6366f1', bg: '#eef2ff', darkBg: 'rgba(99,102,241,0.18)' },
  'Assign to forwarder': { color: '#2563eb', bg: '#eff6ff', darkBg: 'rgba(37,99,235,0.18)' },
  'In Transit': { color: '#0891b2', bg: '#ecfeff', darkBg: 'rgba(8,145,178,0.18)' },
  'Arrived Awaiting Clearance': { color: '#7c3aed', bg: '#f5f3ff', darkBg: 'rgba(124,58,237,0.18)' },
  'Under Clearance': { color: '#7c3aed', bg: '#f5f3ff', darkBg: 'rgba(124,58,237,0.18)' },
  'Delivered': { color: '#059669', bg: '#ecfdf5', darkBg: 'rgba(5,150,105,0.18)' },
};

export const STATUS_DEFAULT: StatusStyle = {
  color: '#66736f',
  bg: '#f5f5f4',
  darkBg: 'rgba(148,163,184,0.14)',
};

export function getStatusStyle(status: string, mode: 'light' | 'dark') {
  const style = STATUS_COLORS[status] || STATUS_DEFAULT;
  return {
    color: style.color,
    bg: mode === 'dark' ? style.darkBg : style.bg,
    border: mode === 'dark' ? `${style.color}66` : `${style.color}33`,
  };
}
