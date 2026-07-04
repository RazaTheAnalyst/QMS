import { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Plus, Star } from 'lucide-react';
import { ENTITIES, STATUS_LIST, CURRENCY_LIST, convertCurrency } from '../types';
import { ADMIN_EMAIL } from '../types';
import type { Quotation, Forwarder, QuotationInput } from '../types';
import { useAuth } from '../auth';
import { COUNTRIES, INCOTERMS_LIST, MODES_LIST } from '../locations';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent } from './ui/card';
import { cn, getModeIcon, formatCurrency } from '@/lib/utils';

const schema = z.object({
  entity: z.string().min(1, 'Entity is required'),
  supplierName: z.string().min(2, 'Supplier name must be at least 2 characters'),
  supplierPO: z.string().min(3, 'PO number must be at least 3 characters'),
  poValue: z.coerce.number().min(1, 'PO value is required'),
  poValueCurrency: z.string().min(3).max(3).default('AED'),
  origin: z.string().min(1, 'Origin is required'),
  destination: z.string().min(1, 'Destination is required'),
  mode: z.string().min(1, 'Mode is required'),
  incoterms: z.string().min(1, 'Incoterms is required'),
  size: z.string().min(1, 'Size is required'),
  transitTime: z.string().optional().default(''),
  etd: z.string().optional().default(''),
  eta: z.string().optional().default(''),
  remarks: z.string().optional().default(''),
  status: z.string().default('Pending'),
  awardedTo: z.string().optional().default(''),
  savings: z.coerce.number().optional().default(0),
  quotes: z.array(z.object({
    forwarder: z.string().min(1, 'Forwarder is required'),
    quotedAmount: z.coerce.number().min(0).default(0),
    currency: z.string().min(3).max(3).default('AED'),
  })).default([]),
});

type QuotationFormData = z.infer<typeof schema>;

interface QuotationFormProps {
  quotation: Quotation | null;
  forwarders: Forwarder[];
  onSave: (data: QuotationInput & { percentage: number; savings: number }) => void;
  onClose: () => void;
}

export default function QuotationForm({ quotation, forwarders, onSave, onClose }: QuotationFormProps) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<QuotationFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      entity: quotation?.entity ?? 'UAE',
      supplierName: quotation?.supplierName ?? '',
      supplierPO: quotation?.supplierPO ?? '',
      poValue: quotation?.poValue ?? 0,
      poValueCurrency: quotation?.poValueCurrency ?? 'AED',
      origin: quotation?.origin ?? '',
      destination: quotation?.destination ?? '',
      mode: quotation?.mode ?? '',
      incoterms: quotation?.incoterms ?? '',
      size: quotation?.size ?? '',
      transitTime: quotation?.transitTime ?? '',
      etd: quotation?.etd ?? '',
      eta: quotation?.eta ?? '',
      remarks: quotation?.remarks ?? '',
      status: quotation?.status ?? 'Pending',
      awardedTo: quotation?.awardedTo ?? '',
      savings: quotation?.savings ?? 0,
      quotes: quotation?.quotes ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'quotes' });

  const poValue = watch('poValue');
  const poValueCurrency = watch('poValueCurrency');
  const originValue = watch('origin');
  const destinationValue = watch('destination');
  const quotes = watch('quotes') ?? [];
  const awardedTo = watch('awardedTo');

  const [originSearch, setOriginSearch] = useState(quotation?.origin ?? '');
  const [destinationSearch, setDestinationSearch] = useState(quotation?.destination ?? '');
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);
  const originWrapperRef = useRef<HTMLDivElement>(null);
  const destWrapperRef = useRef<HTMLDivElement>(null);

  const validQuotesConverted = useMemo(() => {
    return quotes.filter(q => q && q.quotedAmount > 0).map(q => ({
      ...q,
      amountInPoCurrency: convertCurrency(q.quotedAmount, q.currency || 'AED', poValueCurrency),
    }));
  }, [quotes, poValueCurrency]);

  const lowestAmountInPoCurrency = validQuotesConverted.length > 0
    ? Math.min(...validQuotesConverted.map(q => q.amountInPoCurrency)) : 0;
  const percentage = poValue > 0 ? ((lowestAmountInPoCurrency / poValue) * 100).toFixed(2) : '0.00';
  const autoSavings = validQuotesConverted.length >= 2
    ? (() => {
        const awardedAmt = awardedTo
          ? (validQuotesConverted.find(q => q.forwarder === awardedTo)?.amountInPoCurrency ?? lowestAmountInPoCurrency)
          : lowestAmountInPoCurrency;
        return Math.round((lowestAmountInPoCurrency - awardedAmt) * 100) / 100;
      })() : null;

  const filteredOrigins = useMemo(() => {
    if (!originSearch) return COUNTRIES.slice(0, 15);
    const term = originSearch.toLowerCase();
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(term) || c.cities.some(city => city.toLowerCase().includes(term))).slice(0, 30);
  }, [originSearch]);

  const filteredDestinations = useMemo(() => {
    if (!destinationSearch) return COUNTRIES.slice(0, 15);
    const term = destinationSearch.toLowerCase();
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(term) || c.cities.some(city => city.toLowerCase().includes(term))).slice(0, 30);
  }, [destinationSearch]);

  const selectedOriginCountry = useMemo(() =>
    COUNTRIES.find(c => c.cities.some(city => originValue === `${city}, ${c.name}`)) ?? null, [originValue]);
  const selectedDestCountry = useMemo(() =>
    COUNTRIES.find(c => c.cities.some(city => destinationValue === `${city}, ${c.name}`)) ?? null, [destinationValue]);

  const handleOriginCitySelect = (city: string, country: string) => {
    const val = `${city}, ${country}`;
    setValue('origin', val, { shouldValidate: true });
    setOriginSearch(val);
    setShowOriginDropdown(false);
  };

  const handleDestCitySelect = (city: string, country: string) => {
    const val = `${city}, ${country}`;
    setValue('destination', val, { shouldValidate: true });
    setDestinationSearch(val);
    setShowDestinationDropdown(false);
  };

  const handleFormSubmit = (data: QuotationFormData) => {
    const validQ = data.quotes.filter(q => q && q.quotedAmount > 0);
    const validQConverted = validQ.map(q => ({
      ...q,
      amountInPoCurrency: convertCurrency(q.quotedAmount, q.currency || 'AED', data.poValueCurrency || 'AED'),
    }));
    const lowestAmt = validQConverted.length > 0 ? Math.min(...validQConverted.map(q => q.amountInPoCurrency)) : 0;
    const awardedAmt = data.awardedTo
      ? (validQConverted.find(q => q.forwarder === data.awardedTo)?.amountInPoCurrency ?? lowestAmt)
      : lowestAmt;
    const pctVal = data.poValue > 0 ? (lowestAmt / data.poValue) * 100 : 0;
    let savingsVal = data.savings ?? 0;
    if (validQConverted.length >= 2) {
      savingsVal = Math.round((lowestAmt - awardedAmt) * 100) / 100;
    }
    onSave({ ...data, percentage: Math.round(pctVal * 100) / 100, savings: savingsVal } as QuotationFormData & { percentage: number; savings: number });
  };

  const handleAddForwarder = () => {
    const lastForwarder = forwarders[forwarders.length - 1];
    append({ forwarder: lastForwarder?.name ?? '', quotedAmount: 0, currency: 'AED' });
  };

  const renderLocationDropdown = (
    type: 'origin' | 'destination',
    search: string,
    setSearch: (v: string) => void,
    show: boolean,
    setShow: (v: boolean) => void,
    filtered: typeof COUNTRIES,
    selectedCountry: typeof COUNTRIES[number] | null,
    currentValue: string,
    onSelect: (city: string, country: string) => void,
    wrapperRef: React.RefObject<HTMLDivElement | null>,
  ) => {
    const pos = wrapperRef.current?.getBoundingClientRect();
    return (
    <div className="relative" data-location-dropdown ref={wrapperRef}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">📍</span>
        <Input
          placeholder="Search country or city..."
          value={search}
          onChange={e => { setSearch(e.target.value); setValue(type, e.target.value, { shouldValidate: true }); setShow(true); }}
          onFocus={() => setShow(true)}
          onBlur={() => setTimeout(() => setShow(false), 250)}
          className="pl-9"
        />
      </div>
      {show && createPortal(
        <div
          className="max-h-[280px] overflow-y-auto bg-popover border border-border rounded-xl shadow-xl z-[9999]"
          style={{ position: 'fixed', top: (pos?.bottom ?? 0) + 4, left: pos?.left ?? 0, width: pos?.width ?? 300 }}
        >
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">🔍 No matching locations</div>
          ) : (
            filtered.map(country => (
              <div key={country.name} className="border-b border-border last:border-b-0">
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary bg-muted/50 sticky top-0 flex items-center gap-1.5">
                  🌍 {country.name}
                </div>
                <div className="p-2 flex flex-wrap gap-1.5">
                  {country.cities.map(city => (
                    <button
                      key={city}
                      type="button"
                      className={cn(
                        "px-2.5 py-1.5 border border-border rounded-lg bg-background text-xs cursor-pointer transition-all hover:bg-primary/10 hover:border-primary hover:text-primary",
                        selectedCountry?.name === country.name && currentValue === `${city}, ${country.name}` && "bg-primary text-primary-foreground border-primary shadow-sm"
                      )}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => onSelect(city, country.name)}
                    >
                      🏙️ {city}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
    );
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="max-w-[860px] max-h-[92vh] overflow-y-auto p-0 rounded-2xl"
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[data-location-dropdown]')) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[data-location-dropdown]')) {
            e.preventDefault();
          }
        }}
      >
        {/* Header */}
        <DialogHeader className="p-6 pb-5 bg-gradient-to-br from-primary/10 via-cyan-500/5 to-purple-500/10 border-b border-border">
          <DialogTitle className="flex items-center gap-3 text-lg">
            <span className="text-2xl">{quotation ? '✏️' : '📦'}</span>
            <div>
              <span className="bg-gradient-to-r from-primary via-cyan-500 to-purple-500 bg-clip-text text-transparent font-bold">
                {quotation ? 'Edit Quotation' : 'New Quotation Request'}
              </span>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                {quotation ? 'Update the quotation details below' : 'Fill in the details to request a new quotation'}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Summary Bar */}
        {(validQuotesConverted.length > 0 || autoSavings !== null) && (
          <div className="mx-6 mt-5 grid grid-cols-3 gap-3">
            {lowestAmountInPoCurrency > 0 && (
              <div className="text-center p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <div className="text-[10px] font-bold tracking-wider text-primary/70 uppercase mb-1">🏆 Lowest Quote</div>
                <div className="text-lg font-extrabold text-primary">{poValueCurrency} {formatCurrency(lowestAmountInPoCurrency)}</div>
              </div>
            )}
            {autoSavings !== null && (
              <div className={`text-center p-3 rounded-xl bg-gradient-to-br ${autoSavings >= 0 ? 'from-success/10 to-success/5 border border-success/20' : 'from-destructive/10 to-destructive/5 border border-destructive/20'}`}>
                <div className={`text-[10px] font-bold tracking-wider uppercase mb-1 ${autoSavings >= 0 ? 'text-success/70' : 'text-destructive/70'}`}>{autoSavings >= 0 ? '💰 Total Savings' : '🔥 Extra Cost'}</div>
                <div className={`text-lg font-extrabold ${autoSavings >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {poValueCurrency} {formatCurrency(Math.abs(autoSavings))}
                  {poValueCurrency !== 'AED' && (
                    <span className="text-[10px] text-muted-foreground font-normal block mt-0.5">
                      (AED {formatCurrency(convertCurrency(Math.abs(autoSavings), poValueCurrency || 'AED', 'AED'))})
                    </span>
                  )}
                </div>
              </div>
            )}
            {lowestAmountInPoCurrency > 0 && (
              <div className="text-center p-3 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20">
                <div className="text-[10px] font-bold tracking-wider text-cyan-600/70 uppercase mb-1">📊 Freight %</div>
                <div className="text-lg font-extrabold text-cyan-600">{percentage}%</div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="flex flex-col max-h-[calc(100vh-120px)]">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── Section: General Details ─────────────────── */}
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-0">
              <div className="px-5 py-3.5 bg-gradient-to-r from-primary/8 to-transparent border-b border-border/50 flex items-center gap-2">
                <span className="text-lg">📋</span>
                <h3 className="text-sm font-bold text-foreground">General Details</h3>
                <span className="text-[10px] text-muted-foreground ml-1">— Supplier & PO information</span>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-4 max-[1200px]:grid-cols-2 max-[900px]:grid-cols-1">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="entity" className="text-xs font-semibold flex items-center gap-1.5">
                      🏢 Entity
                    </Label>
                    <Select value={watch('entity')} onValueChange={(v) => setValue('entity', v)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ENTITIES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-2 max-[900px]:col-span-1">
                    <Label htmlFor="supplierName" className="text-xs font-semibold flex items-center gap-1.5">
                      🏭 Supplier Name
                    </Label>
                    <Input id="supplierName" placeholder="e.g. Acme Corp, Global Trading LLC" className="h-10" {...register('supplierName')} />
                    {errors.supplierName && <span className="text-xs text-destructive flex items-center gap-1">⚠️ {errors.supplierName.message}</span>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="supplierPO" className="text-xs font-semibold flex items-center gap-1.5">
                      📄 PO Number
                    </Label>
                    <Input id="supplierPO" placeholder="e.g. PO-987654" className="h-10" {...register('supplierPO')} />
                    {errors.supplierPO && <span className="text-xs text-destructive flex items-center gap-1">⚠️ {errors.supplierPO.message}</span>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      💵 PO Value
                    </Label>
                    <div className="flex gap-2">
                      <Input type="number" step="0.01" placeholder="0.00" className="flex-1 h-10" {...register('poValue')} />
                      <Select value={watch('poValueCurrency')} onValueChange={(v) => setValue('poValueCurrency', v)}>
                        <SelectTrigger className="w-[95px] h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CURRENCY_LIST.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {errors.poValue && <span className="text-xs text-destructive flex items-center gap-1">⚠️ {errors.poValue.message}</span>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      {getModeIcon(watch('mode') || '')} Mode of Transport
                    </Label>
                    <Select value={watch('mode')} onValueChange={(v) => setValue('mode', v)}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select Mode" /></SelectTrigger>
                      <SelectContent>
                        {MODES_LIST.map(m => <SelectItem key={m.value} value={m.value}>{getModeIcon(m.value)} {m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.mode && <span className="text-xs text-destructive flex items-center gap-1">⚠️ {errors.mode.message}</span>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      📋 Incoterms
                    </Label>
                    <Select value={watch('incoterms')} onValueChange={(v) => setValue('incoterms', v)}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select Incoterms" /></SelectTrigger>
                      <SelectContent>
                        {INCOTERMS_LIST.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.incoterms && <span className="text-xs text-destructive flex items-center gap-1">⚠️ {errors.incoterms.message}</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Section: Route & Cargo ───────────────────── */}
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-0">
              <div className="px-5 py-3.5 bg-gradient-to-r from-cyan-500/8 to-transparent border-b border-border/50 flex items-center gap-2">
                <span className="text-lg">🌍</span>
                <h3 className="text-sm font-bold text-foreground">Route & Cargo</h3>
                <span className="text-[10px] text-muted-foreground ml-1">— Shipping details</span>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      🛫 Origin Port / City
                    </Label>
                    {renderLocationDropdown('origin', originSearch, setOriginSearch, showOriginDropdown, setShowOriginDropdown, filteredOrigins, selectedOriginCountry, originValue, handleOriginCitySelect, originWrapperRef)}
                    {errors.origin && <span className="text-xs text-destructive flex items-center gap-1">⚠️ {errors.origin.message}</span>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      🛬 Destination Port / City
                    </Label>
                    {renderLocationDropdown('destination', destinationSearch, setDestinationSearch, showDestinationDropdown, setShowDestinationDropdown, filteredDestinations, selectedDestCountry, destinationValue, handleDestCitySelect, destWrapperRef)}
                    {errors.destination && <span className="text-xs text-destructive flex items-center gap-1">⚠️ {errors.destination.message}</span>}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 max-[1200px]:grid-cols-2 max-[900px]:grid-cols-1">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="size" className="text-xs font-semibold flex items-center gap-1.5">
                      📦 Cargo Size / Type
                    </Label>
                    <Input id="size" placeholder="e.g. 1x40 HQ, LCL" className="h-10" {...register('size')} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="transitTime" className="text-xs font-semibold flex items-center gap-1.5">
                      ⏱️ Transit Time
                    </Label>
                    <Input id="transitTime" placeholder="e.g. 25 Days" className="h-10" {...register('transitTime')} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="etd" className="text-xs font-semibold flex items-center gap-1.5">
                      🚢 ETD (Departure)
                    </Label>
                    <Input id="etd" type="date" className="h-10" {...register('etd')} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="eta" className="text-xs font-semibold flex items-center gap-1.5">
                      🏁 ETA (Arrival)
                    </Label>
                    <Input id="eta" type="date" className="h-10" {...register('eta')} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Section: Forwarder Quotes ────────────────── */}
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-0">
              <div className="px-5 py-3.5 bg-gradient-to-r from-success/8 to-transparent border-b border-border/50 flex items-center gap-2">
                <span className="text-lg">💰</span>
                <h3 className="text-sm font-bold text-foreground">Forwarder Quotes</h3>
                <span className="text-[10px] text-muted-foreground ml-1">— Compare prices</span>
                <Badge variant="secondary" className="ml-auto text-[10px] gap-1">
                  ✅ {validQuotesConverted.length} of {fields.length}
                </Badge>
              </div>
              <div className="p-5">
                <div className="flex flex-col gap-3">
                  {fields.map((field, index) => {
                    const isAwarded = awardedTo === field.forwarder;
                    const quoteAmount = watch(`quotes.${index}.quotedAmount`);
                    const quoteCurrency = watch(`quotes.${index}.currency`);
                    const isLowest = quoteAmount > 0 && validQuotesConverted.length > 1 &&
                      convertCurrency(quoteAmount, quoteCurrency || 'AED', poValueCurrency) === lowestAmountInPoCurrency;

                    return (
                      <div
                        key={field.id}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all",
                          isAwarded
                            ? "border-success bg-gradient-to-r from-success/10 to-success/5 shadow-sm"
                            : isLowest
                              ? "border-primary/40 bg-primary/5"
                              : "border-border/60 bg-muted/30 hover:border-border"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors",
                            isAwarded ? "bg-success text-white" : isLowest ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                          )}>
                            {isAwarded ? '🏆' : isLowest ? '🥇' : index + 1}
                          </span>
                          <Select value={watch(`quotes.${index}.forwarder`)} onValueChange={(v) => setValue(`quotes.${index}.forwarder`, v)}>
                            <SelectTrigger className="flex-1 h-10 font-medium"><SelectValue placeholder="🎯 Select Forwarder" /></SelectTrigger>
                            <SelectContent>
                              {forwarders.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <div className="flex gap-2 w-[200px]">
                            <Select value={watch(`quotes.${index}.currency`)} onValueChange={(v) => setValue(`quotes.${index}.currency`, v)}>
                              <SelectTrigger className="w-[80px] h-10"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {CURRENCY_LIST.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="💰 Amount"
                              className="flex-1 h-10 font-mono"
                              {...register(`quotes.${index}.quotedAmount` as const)}
                            />
                          </div>
                          {fields.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive/70 hover:text-destructive hover:bg-destructive/10 shrink-0 rounded-lg" onClick={() => remove(index)}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {(isAwarded || isLowest) && (
                          <div className={cn(
                            "flex items-center gap-1.5 mt-2.5 text-xs font-bold ml-10",
                            isAwarded ? "text-success" : "text-primary"
                          )}>
                            {isAwarded ? (
                              <><Star className="h-3.5 w-3.5 text-warning fill-warning" /> <span>🎉 Awarded Partner</span></>
                            ) : (
                              <><span>🏆</span> <span>Lowest Quote</span></>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <Button type="button" variant="outline" className="mt-4 gap-2 border-dashed border-2 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 h-11" onClick={handleAddForwarder}>
                  <Plus className="h-4 w-4" /> Add Another Quote
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Section: Award & Decision ────────────────── */}
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-0">
              <div className="px-5 py-3.5 bg-gradient-to-r from-warning/8 to-transparent border-b border-border/50 flex items-center gap-2">
                <span className="text-lg">🏆</span>
                <h3 className="text-sm font-bold text-foreground">Award & Decision</h3>
                <span className="text-[10px] text-muted-foreground ml-1">— Finalize selection</span>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-4 max-[1200px]:grid-cols-2 max-[900px]:grid-cols-1">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      📌 Quotation Status
                    </Label>
                    <Select value={watch('status')} onValueChange={(v) => setValue('status', v)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_LIST.filter(s => isAdmin || (s !== 'Awaiting Approval' && s !== 'Rejected')).map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      🤝 Awarded To Forwarder
                    </Label>
                    <Select value={watch('awardedTo') || 'none'} onValueChange={(v) => setValue('awardedTo', v === 'none' ? '' : v)}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="🎯 No Award Chosen" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">🚫 No Award Chosen</SelectItem>
                        {forwarders.map(f => <SelectItem key={f.id} value={f.name}>🏆 {f.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      💰 Savings Calculation
                    </Label>
                    {autoSavings !== null ? (
                      <div className="relative">
                        <Input
                          readOnly
                          className={`h-10 font-bold pr-16 ${autoSavings >= 0 ? 'text-success border-success/50 bg-success/5' : 'text-destructive border-destructive/50 bg-destructive/5'}`}
                          value={`${poValueCurrency} ${formatCurrency(Math.abs(autoSavings))}`}
                        />
                        <Badge variant={autoSavings >= 0 ? 'success' : 'destructive'} className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] px-1.5 py-0">AUTO</Badge>
                      </div>
                    ) : (
                      <Input type="number" step="0.01" placeholder="📝 Manual amount" className="h-10" {...register('savings')} />
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="remarks" className="text-xs font-semibold flex items-center gap-1.5">
                    📝 Remarks & Notes
                  </Label>
                  <Textarea id="remarks" placeholder="💭 Add any freight notes, special instructions, or operational comments..." maxLength={500} className="min-h-[80px] resize-none" {...register('remarks')} />
                </div>
              </div>
            </CardContent>
          </Card>
          </div>

          {/* ── Actions ──────────────────────────────────── */}
          <div className="flex justify-between items-center pt-4 pb-2 px-6 border-t border-border">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              {validQuotesConverted.length > 0 && (
                <span>📊 {validQuotesConverted.length} quote{validQuotesConverted.length !== 1 ? 's' : ''} entered</span>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose} className="gap-2">
                ✖️ Cancel
              </Button>
              <Button type="submit" className="gap-2 bg-gradient-to-r from-primary via-primary to-purple-500 text-white px-8 h-11 font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:opacity-90 transition-all">
                {quotation ? '💾 Update Quotation' : '🚀 Submit Quotation'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
