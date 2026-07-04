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
}

export type QuotationInput = Omit<Quotation, 'id' | 'percentage'>;

export interface Filters {
  search: string;
  entity: string;
  status: string;
}

export const ENTITIES = ['UAE', 'Qatar', 'Oman', 'KSA'] as const;

export const ADMIN_EMAIL = 'admin@netceedmea.com';

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

export const EXCHANGE_RATES: Record<string, number> = {
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
