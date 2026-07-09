import type { Quotation, QuotationInput, Forwarder } from './types';
import { supabase } from './supabase';
import { convertCurrency } from './types';

// --- Row types (snake_case from Supabase) ---
interface QuotationRow {
  id: number;
  entity: string | null;
  supplier_name: string | null;
  supplier_po: string | null;
  po_value: number | null;
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
}

interface ForwarderRow {
  id: number;
  name: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
}

// --- Mappers ---
function rowToQuotation(row: QuotationRow): Quotation {
  let parsedQuotes: { forwarder: string; quotedAmount: number; currency?: string }[] = [];
  let poValueCurrency = 'AED';
  let createdBy = '';
  let createdAt = '';
  let approvedBy = '';
  let approvedAt = '';

  if (row.quotes != null) {
    if (typeof row.quotes === 'string') {
      try {
        const parsed = JSON.parse(row.quotes);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          poValueCurrency = String(parsed.poValueCurrency ?? 'AED');
          createdBy = String(parsed.createdBy ?? '');
          createdAt = String(parsed.createdAt ?? '');
          approvedBy = String(parsed.approvedBy ?? '');
          approvedAt = String(parsed.approvedAt ?? '');
          const items = parsed.items;
          if (Array.isArray(items)) {
            parsedQuotes = items.map((q: Record<string, unknown>) => ({
              forwarder: String(q.forwarder ?? ''),
              quotedAmount: Number(q.quotedAmount ?? q.quoted_amount ?? 0),
              currency: String(q.currency ?? 'AED'),
            }));
          }
        } else if (Array.isArray(parsed)) {
          parsedQuotes = parsed.map((q: Record<string, unknown>) => ({
            forwarder: String(q.forwarder ?? ''),
            quotedAmount: Number(q.quotedAmount ?? q.quoted_amount ?? 0),
            currency: String(q.currency ?? 'AED'),
          }));
        }
      } catch {
        // quotes string is not valid JSON, leave as empty
      }
    } else if (Array.isArray(row.quotes)) {
      parsedQuotes = row.quotes.map((q) => {
        const obj = q as Record<string, unknown>;
        return {
          forwarder: String(obj.forwarder ?? ''),
          quotedAmount: Number(obj.quotedAmount ?? obj.quoted_amount ?? 0),
          currency: String(obj.currency ?? 'AED'),
        };
      });
    } else if (typeof row.quotes === 'object' && row.quotes !== null) {
      const obj = row.quotes as Record<string, unknown>;
      poValueCurrency = String(obj.poValueCurrency ?? 'AED');
      createdBy = String(obj.createdBy ?? '');
      createdAt = String(obj.createdAt ?? '');
      approvedBy = String(obj.approvedBy ?? '');
      approvedAt = String(obj.approvedAt ?? '');
      const items = obj.items;
      if (Array.isArray(items)) {
        parsedQuotes = items.map((q) => {
          const qObj = q as Record<string, unknown>;
          return {
            forwarder: String(qObj.forwarder ?? ''),
            quotedAmount: Number(qObj.quotedAmount ?? qObj.quoted_amount ?? 0),
            currency: String(qObj.currency ?? 'AED'),
          };
        });
      }
    }
  }

  return {
    id: row.id,
    entity: row.entity ?? '',
    supplierName: row.supplier_name ?? '',
    supplierPO: row.supplier_po ?? '',
    poValue: Number(row.po_value) || 0,
    poValueCurrency,
    origin: row.origin ?? '',
    destination: row.destination ?? '',
    mode: row.mode ?? '',
    size: row.size ?? '',
    transitTime: row.transit_time ?? '',
    incoterms: row.incoterms ?? '',
    quotes: parsedQuotes,
    awardedTo: row.awarded_to ?? '',
    remarks: row.remarks ?? '',
    percentage: Number(row.percentage) || 0,
    etd: row.etd ?? '',
    eta: row.eta ?? '',
    status: row.status ?? 'Pending',
    savings: Number(row.savings) || 0,
    createdBy,
    createdAt,
    approvedBy,
    approvedAt,
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

function quotationInputToRow(data: QuotationInput, percentage = 0) {
  return {
    entity: data.entity,
    supplier_name: data.supplierName,
    supplier_po: data.supplierPO,
    po_value: data.poValue,
    origin: data.origin,
    destination: data.destination,
    mode: data.mode,
    size: data.size,
    transit_time: data.transitTime,
    incoterms: data.incoterms,
    quotes: JSON.stringify({
      poValueCurrency: data.poValueCurrency || 'AED',
      items: data.quotes,
      createdBy: data.createdBy ?? '',
      createdAt: data.createdAt ?? '',
      approvedBy: data.approvedBy ?? '',
      approvedAt: data.approvedAt ?? '',
    }),
    awarded_to: data.awardedTo,
    remarks: data.remarks,
    percentage,
    etd: data.etd ?? '',
    eta: data.eta ?? '',
    status: data.status ?? 'Pending',
    savings: data.savings ?? 0,
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

function safeMin(arr: number[]): number {
  if (arr.length === 0) return 0;
  let min = Infinity;
  for (const v of arr) { if (v < min) min = v; }
  return min;
}

function safeMax(arr: number[]): number {
  if (arr.length === 0) return 0;
  let max = -Infinity;
  for (const v of arr) { if (v > max) max = v; }
  return max;
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

function computeSavings(data: { poValueCurrency?: string; quotes?: { forwarder: string; quotedAmount: number; currency?: string }[]; savings?: number }, manualSavings?: number): number {
  const validQuotes = (data.quotes ?? []).filter(q => q.quotedAmount > 0);
  if (validQuotes.length < 2) return manualSavings ?? data.savings ?? 0;
  const poCurrency = data.poValueCurrency || 'AED';
  const convertedAmounts = validQuotes.map(q => convertCurrency(q.quotedAmount, q.currency || 'AED', poCurrency));
  const highest = safeMax(convertedAmounts);
  const lowest = safeMin(convertedAmounts);
  return Math.round((highest - lowest) * 100) / 100;
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
    } catch (err) {
      console.error('Failed to map quotation row:', row?.id, err);
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
  // First fetch the existing record to merge partial updates
  const { data: existing, error: fetchError } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError) throw fetchError;
  if (!existing) throw new Error('Quotation not found');

  const existingRow = existing as QuotationRow;
  const parsedExisting = rowToQuotation(existingRow);

  // Build merged data for recomputation
  const mergedQuotes = input.quotes !== undefined ? input.quotes : parsedExisting.quotes;
  const mergedPoValueCurrency = input.poValueCurrency !== undefined ? input.poValueCurrency : parsedExisting.poValueCurrency;
  const mergedPoValue = input.poValue !== undefined ? input.poValue : parsedExisting.poValue;

  const row: Record<string, unknown> = {};
  if (input.entity !== undefined) row.entity = input.entity;
  if (input.supplierName !== undefined) row.supplier_name = input.supplierName;
  if (input.supplierPO !== undefined) row.supplier_po = input.supplierPO;
  if (input.poValue !== undefined) row.po_value = input.poValue;
  if (input.origin !== undefined) row.origin = input.origin;
  if (input.destination !== undefined) row.destination = input.destination;
  if (input.mode !== undefined) row.mode = input.mode;
  if (input.size !== undefined) row.size = input.size;
  if (input.transitTime !== undefined) row.transit_time = input.transitTime;
  if (input.incoterms !== undefined) row.incoterms = input.incoterms;
  
  row.quotes = JSON.stringify({
    poValueCurrency: mergedPoValueCurrency || 'AED',
    items: mergedQuotes,
    createdBy: input.createdBy !== undefined ? input.createdBy : parsedExisting.createdBy ?? '',
    createdAt: input.createdAt !== undefined ? input.createdAt : parsedExisting.createdAt ?? '',
    approvedBy: input.approvedBy !== undefined ? input.approvedBy : parsedExisting.approvedBy ?? '',
    approvedAt: input.approvedAt !== undefined ? input.approvedAt : parsedExisting.approvedAt ?? '',
  });

  if (input.awardedTo !== undefined) row.awarded_to = input.awardedTo;
  if (input.remarks !== undefined) row.remarks = input.remarks;
  if (input.percentage !== undefined) row.percentage = input.percentage;
  if (input.etd !== undefined) row.etd = input.etd;
  if (input.eta !== undefined) row.eta = input.eta;
  if (input.status !== undefined) row.status = input.status;
  if (input.savings !== undefined) row.savings = input.savings;

  // Recompute percentage and savings using merged data
  if (input.quotes !== undefined || input.poValue !== undefined || input.poValueCurrency !== undefined) {
    const percentage = computePercentage({ quotes: mergedQuotes, poValue: mergedPoValue, poValueCurrency: mergedPoValueCurrency });
    const savings = computeSavings({ quotes: mergedQuotes, poValueCurrency: mergedPoValueCurrency }, input.savings);
    row.percentage = percentage;
    row.savings = savings;
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
