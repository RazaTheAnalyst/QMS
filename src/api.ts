import type { Quotation, QuotationInput, Quote, Forwarder, AppUser, AppUserInput, AppModule, UserRole } from './types';
import { supabase } from './supabase';
import { calculateAwardSavings, convertCurrency } from './types';

// --- Row types (snake_case from Supabase) ---
interface QuotationRow {
  id: number;
  entity: string | null;
  supplier_name: string | null;
  supplier_po: string | null;
  po_value: number | null;
  po_value_currency: string | null;
  origin: string | null;
  destination: string | null;
  mode: string | null;
  size: string | null;
  transit_time: string | null;
  incoterms: string | null;
  quotes: unknown;
  awarded_to: string | null;
  remarks: string | null;
  percentage: number | null;
  etd: string | null;
  eta: string | null;
  status: string | null;
  savings: number | null;
  created_by: string | null;
  created_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  excluded_from_po: boolean | null;
}

interface ForwarderRow {
  id: number;
  name: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
}

interface AppUserRow {
  id: number;
  name: string | null;
  email: string | null;
  role: string | null;
  modules: unknown;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

// --- Quotes blob helpers ---
// Legacy rows may keep quotation metadata inside the `quotes` JSON text column.
// New rows store that metadata in dedicated columns; the blob only holds items.
interface QuotesBlob {
  poValueCurrency: string;
  createdBy: string;
  createdAt: string;
  approvedBy: string;
  approvedAt: string;
  excludedFromPO: boolean;
  items: Quote[];
}

function readQuoteItems(items: unknown): Quote[] {
  if (!Array.isArray(items)) return [];
  return items.map((q) => {
    const obj = q as Record<string, unknown>;
    return {
      forwarder: String(obj.forwarder ?? ''),
      quotedAmount: Number(obj.quotedAmount ?? obj.quoted_amount ?? 0),
      currency: String(obj.currency ?? 'AED'),
    };
  });
}

function parseQuotesBlob(quotes: unknown): QuotesBlob {
  const parsed: QuotesBlob = {
    poValueCurrency: 'AED',
    createdBy: '',
    createdAt: '',
    approvedBy: '',
    approvedAt: '',
    excludedFromPO: false,
    items: [],
  };

  if (quotes == null) return parsed;

  if (typeof quotes === 'string') {
    try {
      const val = JSON.parse(quotes);
      if (Array.isArray(val)) {
        parsed.items = readQuoteItems(val);
      } else if (val && typeof val === 'object') {
        parsed.poValueCurrency = String(val.poValueCurrency ?? 'AED');
        parsed.createdBy = String(val.createdBy ?? '');
        parsed.createdAt = String(val.createdAt ?? '');
        parsed.approvedBy = String(val.approvedBy ?? '');
        parsed.approvedAt = String(val.approvedAt ?? '');
        parsed.excludedFromPO = val.excludedFromPO === true;
        parsed.items = readQuoteItems(val.items);
      }
    } catch {
      // quotes string is not valid JSON, leave as empty
    }
  } else if (Array.isArray(quotes)) {
    parsed.items = readQuoteItems(quotes);
  } else if (typeof quotes === 'object') {
    const obj = quotes as Record<string, unknown>;
    parsed.poValueCurrency = String(obj.poValueCurrency ?? 'AED');
    parsed.createdBy = String(obj.createdBy ?? '');
    parsed.createdAt = String(obj.createdAt ?? '');
    parsed.approvedBy = String(obj.approvedBy ?? '');
    parsed.approvedAt = String(obj.approvedAt ?? '');
    parsed.excludedFromPO = obj.excludedFromPO === true;
    parsed.items = readQuoteItems(obj.items);
  }

  return parsed;
}

// --- Mappers ---
function rowToQuotation(row: QuotationRow): Quotation {
  const blob = parseQuotesBlob(row.quotes);
  return {
    id: row.id,
    entity: row.entity ?? '',
    supplierName: row.supplier_name ?? '',
    supplierPO: row.supplier_po ?? '',
    poValue: Number(row.po_value) || 0,
    poValueCurrency: row.po_value_currency ?? blob.poValueCurrency ?? 'AED',
    origin: row.origin ?? '',
    destination: row.destination ?? '',
    mode: row.mode ?? '',
    size: row.size ?? '',
    transitTime: row.transit_time ?? '',
    incoterms: row.incoterms ?? '',
    quotes: blob.items,
    awardedTo: row.awarded_to ?? '',
    remarks: row.remarks ?? '',
    percentage: Number(row.percentage) || 0,
    etd: row.etd ?? '',
    eta: row.eta ?? '',
    status: row.status ?? 'Pending',
    savings: Number(row.savings) || 0,
    createdBy: row.created_by ?? blob.createdBy,
    createdAt: row.created_at ?? blob.createdAt,
    approvedBy: row.approved_by ?? blob.approvedBy,
    approvedAt: row.approved_at ?? blob.approvedAt,
    excludedFromPO: row.excluded_from_po ?? blob.excludedFromPO,
  };
}

function rowToForwarder(row: ForwarderRow): Forwarder {
  return {
    id: row.id,
    name: row.name ?? '',
    contactPerson: row.contact_person ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
  };
}

function rowToAppUser(row: AppUserRow): AppUser {
  const modules = Array.isArray(row.modules)
    ? row.modules.map(String).filter(Boolean) as AppModule[]
    : [];
  return {
    id: row.id,
    name: row.name ?? '',
    email: row.email ?? '',
    role: (row.role ?? 'Sales') as UserRole,
    modules,
    active: row.active ?? true,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}

function quotationInputToRow(data: QuotationInput, percentage = 0) {
  return {
    entity: data.entity,
    supplier_name: data.supplierName,
    supplier_po: data.supplierPO,
    po_value: data.poValue,
    po_value_currency: data.poValueCurrency || 'AED',
    origin: data.origin,
    destination: data.destination,
    mode: data.mode,
    size: data.size,
    transit_time: data.transitTime,
    incoterms: data.incoterms,
    quotes: JSON.stringify({
      poValueCurrency: data.poValueCurrency || 'AED',
      items: data.quotes,
    }),
    awarded_to: data.awardedTo,
    remarks: data.remarks,
    percentage,
    etd: data.etd ?? '',
    eta: data.eta ?? '',
    status: data.status ?? 'Pending',
    savings: data.savings ?? 0,
    created_by: data.createdBy ?? '',
    created_at: data.createdAt ?? '',
    approved_by: data.approvedBy ?? '',
    approved_at: data.approvedAt ?? '',
    excluded_from_po: data.excludedFromPO ?? false,
  };
}

function forwarderInputToRow(data: Omit<Forwarder, 'id'>) {
  return {
    name: data.name,
    contact_person: data.contactPerson,
    email: data.email,
    phone: data.phone,
  };
}

function appUserInputToRow(data: AppUserInput) {
  return {
    name: data.name,
    email: data.email.toLowerCase().trim(),
    role: data.role,
    modules: data.modules,
    active: data.active,
  };
}

function safeMin(arr: number[]): number {
  if (arr.length === 0) return 0;
  let min = Infinity;
  for (const v of arr) { if (v < min) min = v; }
  return min;
}

function computePercentage(data: { poValue?: number; poValueCurrency?: string; quotes?: { forwarder: string; quotedAmount: number; currency?: string }[] }): number {
  const poValue = data.poValue ?? 0;
  if (poValue <= 0) return 0;
  const poCurrency = data.poValueCurrency || 'AED';
  const validQuotes = (data.quotes ?? []).filter(q => q.quotedAmount > 0);
  if (validQuotes.length === 0) return 0;
  const convertedAmounts = validQuotes.map(q => convertCurrency(q.quotedAmount, q.currency || 'AED', poCurrency));
  const lowestAmount = safeMin(convertedAmounts);
  return Math.round((lowestAmount / poValue) * 10000) / 100;
}

function computeSavings(data: { poValueCurrency?: string; quotes?: { forwarder: string; quotedAmount: number; currency?: string }[]; awardedTo?: string; savings?: number }, manualSavings?: number): number {
  const validQuotes = (data.quotes ?? []).filter(q => q.quotedAmount > 0);
  if (validQuotes.length < 2) return manualSavings ?? data.savings ?? 0;
  const awardSavings = calculateAwardSavings(validQuotes, data.poValueCurrency || 'AED', data.awardedTo || '');
  return awardSavings ?? manualSavings ?? data.savings ?? 0;
}

// --- Quotations API ---
export async function fetchQuotations(): Promise<Quotation[]> {
  const { data, error } = await supabase
    .from('quotations')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  const quotations: Quotation[] = [];
  for (const row of rows) {
    try {
      quotations.push(rowToQuotation(row as QuotationRow));
    } catch {
      // Row mapping failed — skip malformed rows
    }
  }
  return quotations;
}

export async function createQuotation(input: QuotationInput): Promise<Quotation> {
  const percentage = computePercentage(input);
  const savings = computeSavings(input);
  const { data, error } = await supabase
    .from('quotations')
    .insert({ ...quotationInputToRow(input, percentage), savings })
    .select()
    .single();
  if (error) throw error;
  if (!data) throw new Error('No data returned from create');
  return rowToQuotation(data as QuotationRow);
}

export async function updateQuotationAPI(id: number, input: Partial<QuotationInput> & { percentage?: number }): Promise<Quotation> {
  // Recompute percentage/savings from the merged record only when the economic
  // inputs (quotes/PO value/currency) change. Other partial updates write
  // their columns directly — this is what makes status/award/approval updates
  // safe without fetching or rewriting the whole record.
  const recompute = input.quotes !== undefined || input.poValue !== undefined || input.poValueCurrency !== undefined;

  let parsedExisting: Quotation | null = null;
  if (recompute) {
    const { data: existing, error: fetchError } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;
    if (!existing) throw new Error('Quotation not found');
    parsedExisting = rowToQuotation(existing as QuotationRow);
  }

  const row: Record<string, unknown> = {};
  if (input.entity !== undefined) row.entity = input.entity;
  if (input.supplierName !== undefined) row.supplier_name = input.supplierName;
  if (input.supplierPO !== undefined) row.supplier_po = input.supplierPO;
  if (input.poValue !== undefined) row.po_value = input.poValue;
  if (input.poValueCurrency !== undefined) row.po_value_currency = input.poValueCurrency;
  if (input.origin !== undefined) row.origin = input.origin;
  if (input.destination !== undefined) row.destination = input.destination;
  if (input.mode !== undefined) row.mode = input.mode;
  if (input.size !== undefined) row.size = input.size;
  if (input.transitTime !== undefined) row.transit_time = input.transitTime;
  if (input.incoterms !== undefined) row.incoterms = input.incoterms;
  if (input.awardedTo !== undefined) row.awarded_to = input.awardedTo;
  if (input.remarks !== undefined) row.remarks = input.remarks;
  if (input.etd !== undefined) row.etd = input.etd;
  if (input.eta !== undefined) row.eta = input.eta;
  if (input.status !== undefined) row.status = input.status;
  if (input.createdBy !== undefined) row.created_by = input.createdBy;
  if (input.createdAt !== undefined) row.created_at = input.createdAt;
  if (input.approvedBy !== undefined) row.approved_by = input.approvedBy;
  if (input.approvedAt !== undefined) row.approved_at = input.approvedAt;
  if (input.excludedFromPO !== undefined) row.excluded_from_po = input.excludedFromPO;

  if (input.quotes !== undefined) {
    row.quotes = JSON.stringify({
      poValueCurrency: parsedExisting?.poValueCurrency || input.poValueCurrency || 'AED',
      items: input.quotes,
    });
  }

  if (recompute && parsedExisting) {
    const mergedQuotes = input.quotes !== undefined ? input.quotes : parsedExisting.quotes;
    const mergedPoValueCurrency = input.poValueCurrency !== undefined ? input.poValueCurrency : parsedExisting.poValueCurrency;
    const mergedPoValue = input.poValue !== undefined ? input.poValue : parsedExisting.poValue;
    const mergedAwardedTo = input.awardedTo !== undefined ? input.awardedTo : parsedExisting.awardedTo;
    row.percentage = computePercentage({ quotes: mergedQuotes, poValue: mergedPoValue, poValueCurrency: mergedPoValueCurrency });
    row.savings = computeSavings(
      { quotes: mergedQuotes, poValueCurrency: mergedPoValueCurrency, awardedTo: mergedAwardedTo },
      input.savings ?? parsedExisting.savings
    );
  } else {
    if (input.percentage !== undefined) row.percentage = input.percentage;
    if (input.savings !== undefined) row.savings = input.savings;
  }

  const { data, error } = await supabase
    .from('quotations')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  if (!data) throw new Error('No data returned from update');
  return rowToQuotation(data as QuotationRow);
}

export async function deleteQuotationAPI(id: number): Promise<void> {
  const { error } = await supabase
    .from('quotations')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// --- Forwarders API ---
export async function fetchForwarders(): Promise<Forwarder[]> {
  const { data, error } = await supabase
    .from('forwarders')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToForwarder);
}

export async function createForwarderAPI(data: Omit<Forwarder, 'id'>): Promise<Forwarder> {
  const { data: row, error } = await supabase
    .from('forwarders')
    .insert(forwarderInputToRow(data))
    .select()
    .single();
  if (error) throw error;
  if (!row) throw new Error('No data returned from create');
  return rowToForwarder(row as ForwarderRow);
}

export async function deleteForwarderAPI(id: number): Promise<void> {
  const { error } = await supabase
    .from('forwarders')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function updateForwarderAPI(id: number, data: Omit<Forwarder, 'id'>): Promise<Forwarder> {
  const { data: row, error } = await supabase
    .from('forwarders')
    .update(forwarderInputToRow(data))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  if (!row) throw new Error('No data returned from update');
  return rowToForwarder(row as ForwarderRow);
}

// --- App Users API ---
export async function fetchAppUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(row => rowToAppUser(row as AppUserRow));
}

export async function createAppUserAPI(data: AppUserInput): Promise<AppUser> {
  const { data: row, error } = await supabase
    .from('app_users')
    .insert(appUserInputToRow(data))
    .select()
    .single();
  if (error) throw error;
  if (!row) throw new Error('No data returned from create');
  return rowToAppUser(row as AppUserRow);
}

export async function updateAppUserAPI(id: number, data: AppUserInput): Promise<AppUser> {
  const { data: row, error } = await supabase
    .from('app_users')
    .update(appUserInputToRow(data))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  if (!row) throw new Error('No data returned from update');
  return rowToAppUser(row as AppUserRow);
}

export async function deleteAppUserAPI(id: number): Promise<void> {
  const { error } = await supabase
    .from('app_users')
    .delete()
    .eq('id', id);
  if (error) throw error;
}