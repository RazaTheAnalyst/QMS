export interface Quote {
  forwarder: string;
  quotedAmount: number;
  currency?: string;
}

export interface Forwarder {
  id: number;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
}

export type UserRole = 'Admin' | 'Logistics' | 'Sales';
export type AppModule = 'dashboard' | 'quotations' | 'forwarders' | 'users';

export interface AppUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  modules: AppModule[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type AppUserInput = Omit<AppUser, 'id' | 'createdAt' | 'updatedAt'>;

export type QuotationStatus = typeof STATUS_LIST[number];
export type Currency = typeof CURRENCY_LIST[number];
export type Entity = typeof ENTITIES[number];

export interface Quotation {
  id: number;
  entity: string;
  supplierName: string;
  supplierPO: string;
  poValue: number;
  poValueCurrency?: string;
  origin: string;
  destination: string;
  mode: string;
  size: string;
  transitTime: string;
  incoterms: string;
  quotes: Quote[];
  awardedTo: string;
  remarks: string;
  percentage: number;
  etd: string;
  eta: string;
  status: string;
  savings: number;
  createdBy?: string;
  createdAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  excludedFromPO?: boolean;
}

export type QuotationInput = Omit<Quotation, 'id' | 'percentage'>;

export interface Filters {
  search: string;
  entity: string;
  status: string;
  mode: string;
  forwarder: string;
  dateFrom: string;
  dateTo: string;
}

export interface DashboardFilters {
  dateFrom: string;
  dateTo: string;
}

export const ENTITIES = ['UAE', 'Qatar', 'Oman'] as const;

// Server-side authorization is enforced via Supabase RLS policies.
// This constant is kept for cosmetic UI hints only (e.g., showing/hiding tabs).
// Do NOT rely on this for security decisions.
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@netceedmea.com';

export const USER_ROLES: UserRole[] = ['Admin', 'Logistics', 'Sales'];

export const APP_MODULES: Array<{ key: AppModule; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'quotations', label: 'Quotations' },
  { key: 'forwarders', label: 'Forwarders' },
  { key: 'users', label: 'Users' },
];

export const STATUS_LIST = [
  'Awaiting Approval',
  'Rejected',
  'Pending',
  'Sent for quotation',
  'Assign to forwarder',
  'In Transit',
  'Arrived Awaiting Clearance',
  'Under Clearance',
  'Delivered',
] as const;

export const CURRENCY_LIST = ['AED', 'USD', 'QAR', 'OMR', 'GBP', 'SAR', 'EUR'] as const;

const EXCHANGE_RATES: Record<string, number> = {
  AED: 1.0,
  USD: 0.2723,     // 1 AED = 0.2723 USD
  QAR: 0.9912,     // 1 AED = 0.9912 QAR
  OMR: 0.1048,     // 1 AED = 0.1048 OMR
  GBP: 0.2145,     // 1 AED = 0.2145 GBP
  SAR: 1.0210,     // 1 AED = 1.0210 SAR
  EUR: 0.2541,     // 1 AED = 0.2541 EUR
};

export function convertCurrency(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  const rateFrom = EXCHANGE_RATES[from] || 1.0;
  const rateTo = EXCHANGE_RATES[to] || 1.0;
  return amount * (rateTo / rateFrom);
}

export function calculateAwardSavings(
  quotes: Quote[] = [],
  poValueCurrency = 'AED',
  awardedTo = ''
): number | null {
  const validQuotes = quotes.filter(q => q.quotedAmount > 0);
  if (validQuotes.length < 2) return null;

  const convertedQuotes = validQuotes.map(q => ({
    forwarder: q.forwarder,
    amount: convertCurrency(q.quotedAmount, q.currency || 'AED', poValueCurrency),
  }));
  const amounts = convertedQuotes.map(q => q.amount);
  const lowestAmount = Math.min(...amounts);
  const highestAmount = Math.max(...amounts);
  if (!awardedTo) return null;

  const awardedAmount = convertedQuotes.find(q => q.forwarder === awardedTo)?.amount;
  if (awardedAmount === undefined) return null;

  if (awardedAmount > lowestAmount) {
    return Math.round((lowestAmount - awardedAmount) * 100) / 100;
  }

  return Math.round((highestAmount - lowestAmount) * 100) / 100;
}
