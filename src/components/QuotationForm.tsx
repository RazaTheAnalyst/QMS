import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import type { FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ENTITIES, STATUS_LIST, CURRENCY_LIST, calculateAwardSavings, convertCurrency } from '../types';
import { ADMIN_EMAIL } from '../types';
import type { Quotation, Forwarder, QuotationInput } from '../types';
import { useAuth } from '../auth';
import { COUNTRIES, INCOTERMS_LIST, MODES_LIST } from '../locations';
import { getModeIcon, formatCurrency } from '@/lib/utils';
import {
  Dialog, DialogTitle, Box, Button, TextField,
  FormControl, Select, MenuItem,
  Typography, IconButton, Chip, Popover, Stack, Paper, Alert, FormHelperText,
} from '@mui/material';
import {
  Close, Add, Star, LocationOn, ExpandMore, Info, Route,
  AttachMoney, EmojiEvents, Check,
} from '@mui/icons-material';

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

function LocationPopover({
  value, setValue, label, error, helperText,
}: {
  value: string;
  setValue: (v: string) => void;
  label: string;
  error?: boolean;
  helperText?: string;
}) {
  const [search, setSearch] = useState(value);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const filterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && filterRef.current) {
      setTimeout(() => filterRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return COUNTRIES.slice(0, 15);
    const term = search.toLowerCase();
    return COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.cities.some(city => city.toLowerCase().includes(term))
    ).slice(0, 30);
  }, [search]);

  return (
    <FormField label={label}>
      <TextField
        value={value || search}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        placeholder="Search country or city..."
        size="small"
        fullWidth
        error={error}
        helperText={helperText}
        sx={fieldSx}
        InputProps={{
          readOnly: true,
          startAdornment: <LocationOn fontSize="small" color="action" sx={{ mr: 0.5 }} />,
          endAdornment: <ExpandMore fontSize="small" color="action" />,
        }}
      />
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { width: anchorEl?.offsetWidth, mt: 0.5 } } }}
      >
        <Box sx={{ p: 1 }}>
          <TextField
            inputRef={filterRef}
            placeholder="Filter locations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            size="small"
            fullWidth
          />
        </Box>
        <Box sx={{ maxHeight: 280, overflow: 'auto' }}>
          {filtered.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>No matching locations</Typography>
          ) : (
            filtered.map(country => (
              <Box key={country.name}>
                <Typography variant="caption" sx={{
                  px: 1.5, py: 0.75, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'primary.main', bgcolor: 'action.hover',
                  position: 'sticky', top: 0, display: 'block',
                }}>
                  {country.name}
                </Typography>
                <Box sx={{ p: 0.75, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {country.cities.map(city => {
                    const val = `${city}, ${country.name}`;
                    const isSelected = value === val;
                    return (
                      <Chip
                        key={city}
                        label={city}
                        size="small"
                        variant={isSelected ? 'filled' : 'outlined'}
                        color={isSelected ? 'primary' : 'default'}
                        onClick={() => { setValue(val); setSearch(val); setAnchorEl(null); }}
                        sx={{ cursor: 'pointer' }}
                      />
                    );
                  })}
                </Box>
              </Box>
            ))
          )}
        </Box>
      </Popover>
    </FormField>
  );
}

const fieldSx = {
  '& .MuiInputBase-root': {
    minHeight: 40,
    bgcolor: 'background.paper',
  },
  '& .MuiInputBase-input': {
    py: 1.05,
  },
};

const selectSx = {
  ...fieldSx,
  '& .MuiSelect-select': {
    minHeight: '1.4375em',
    display: 'flex',
    alignItems: 'center',
  },
};

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        component="label"
        sx={{
          display: 'block',
          mb: 0.6,
          color: 'text.secondary',
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: 0,
          textTransform: 'none',
        }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
}

function SectionIcon({ icon: Icon, color }: { icon: React.ElementType; color: string }) {
  return (
    <Box sx={{
      width: 30,
      height: 30,
      borderRadius: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: color,
      color: '#fff',
      flexShrink: 0,
      boxShadow: '0 8px 20px -14px currentColor',
    }}>
      <Icon sx={{ fontSize: 17 }} />
    </Box>
  );
}

interface QuotationFormProps {
  quotation: Quotation | null;
  forwarders: Forwarder[];
  onSave: (data: QuotationInput & { percentage: number; savings: number }) => void;
  onClose: () => void;
}

export default function QuotationForm({ quotation, forwarders, onSave, onClose }: QuotationFormProps) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [submitError, setSubmitError] = useState('');

  const { control, handleSubmit, setValue, formState: { errors, isDirty } } = useForm<QuotationFormData>({
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

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const { fields, append, remove } = useFieldArray({ control, name: 'quotes' });
  const poValueCurrency = useWatch({ control, name: 'poValueCurrency' }) ?? 'AED';
  const poValue = useWatch({ control, name: 'poValue' }) ?? 0;
  const awardedTo = useWatch({ control, name: 'awardedTo' }) ?? '';
  const quotes = useWatch({ control, name: 'quotes' });

  const validQuotesConverted = useMemo(() => {
    return quotes.filter(q => q && q.quotedAmount > 0).map(q => ({
      ...q,
      amountInPoCurrency: convertCurrency(q.quotedAmount, q.currency || 'AED', poValueCurrency),
    }));
  }, [quotes, poValueCurrency]);

  const lowestAmountInPoCurrency = validQuotesConverted.length > 0
    ? Math.min(...validQuotesConverted.map(q => q.amountInPoCurrency)) : 0;
  const percentageValue = lowestAmountInPoCurrency > 0 && (() => {
    const pv = typeof poValue === 'number' ? poValue : 0;
    return pv > 0 ? ((lowestAmountInPoCurrency / pv) * 100).toFixed(2) : '0.00';
  })() || '0.00';

  const autoSavings = validQuotesConverted.length >= 2
    ? calculateAwardSavings(quotes, poValueCurrency, awardedTo) : null;

  const handleFormSubmit = (data: QuotationFormData) => {
    setSubmitError('');
    const validQ = data.quotes.filter(q => q && q.quotedAmount > 0);
    const validQConverted = validQ.map(q => ({
      ...q,
      amountInPoCurrency: convertCurrency(q.quotedAmount, q.currency || 'AED', data.poValueCurrency || 'AED'),
    }));
    const lowestAmt = validQConverted.length > 0 ? Math.min(...validQConverted.map(q => q.amountInPoCurrency)) : 0;
    const pctVal = data.poValue > 0 ? (lowestAmt / data.poValue) * 100 : 0;
    let savingsVal = data.savings ?? 0;
    if (validQConverted.length >= 2) {
      savingsVal = calculateAwardSavings(validQ, data.poValueCurrency || 'AED', data.awardedTo) ?? 0;
    }
    onSave({ ...data, percentage: Math.round(pctVal * 100) / 100, savings: savingsVal });
  };

  const handleInvalidSubmit = (formErrors: FieldErrors<QuotationFormData>) => {
    const firstError = Object.values(formErrors)[0];
    const message = typeof firstError?.message === 'string'
      ? firstError.message
      : 'Please complete the required fields highlighted in the form.';
    setSubmitError(message);
  };

  const handleAddForwarder = () => {
    const lastForwarder = forwarders[forwarders.length - 1];
    append({ forwarder: lastForwarder?.name ?? '', quotedAmount: 0, currency: 'AED' });
  };

  const sectionCard = (title: string, icon: React.ElementType, color: string, children: React.ReactNode) => (
    <Paper variant="outlined" sx={{
      borderRadius: 2,
      overflow: 'visible',
      borderColor: 'divider',
      boxShadow: '0 12px 30px -28px rgba(23,32,31,0.5)',
    }}>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 1.75, sm: 2.25 },
        py: { xs: 1.15, sm: 1.3 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'rgba(15,118,110,0.035)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <SectionIcon icon={icon} color={color} />
          <Typography variant="subtitle1" fontWeight={800}>{title}</Typography>
        </Box>
      </Box>
      <Box sx={{ p: { xs: 1.75, sm: 2.1 } }}>
        {children}
      </Box>
    </Paper>
  );

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth sx={{
      '& .MuiDialog-paper': {
        maxHeight: { xs: '100dvh', sm: 'calc(100dvh - 1.25rem)' },
        maxWidth: 980,
        bgcolor: 'background.default',
        overflow: 'hidden',
      },
    }}>
      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.75,
        px: { xs: 2, sm: 3 },
        py: { xs: 1.5, sm: 1.9 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}>
        <Box sx={{ width: 42, height: 42, borderRadius: 1.5,
          background: 'linear-gradient(135deg, #0f766e, #31748f)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          boxShadow: '0 12px 24px -16px rgba(15,118,110,0.8)',
        }}>
          {quotation ? <EmojiEvents sx={{ fontSize: 20 }} /> : <Add sx={{ fontSize: 20 }} />}
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {quotation ? 'Edit Quotation' : 'New Quotation Request'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {quotation ? 'Update the quotation details below' : 'Fill in the details to request a new quotation'}
          </Typography>
        </Box>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit(handleFormSubmit, handleInvalidSubmit)} noValidate sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, maxHeight: 'inherit' }}>
        <Box sx={{ overflowY: 'auto', p: { xs: 1.5, sm: 2 }, pb: { xs: 2.5, sm: 2 }, display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 1.75 } }}>
          {sectionCard('General Details', Info, 'primary.main',
            <Box>
              <Stack spacing={1.75}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: { xs: 1.5, sm: 1.75 } }}>
                  <FormField label="Entity">
                    <FormControl size="small" fullWidth error={!!errors.entity} sx={selectSx}>
                      <Controller name="entity" control={control} render={({ field }) => (
                        <Select {...field}>
                          {ENTITIES.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                        </Select>
                      )} />
                    </FormControl>
                  </FormField>
                  <Controller name="supplierName" control={control} render={({ field }) => (
                    <FormField label="Supplier Name">
                      <TextField {...field} placeholder="e.g. Acme Corp, Global Trading LLC"
                        size="small" fullWidth error={!!errors.supplierName} helperText={errors.supplierName?.message as string} sx={fieldSx} />
                    </FormField>
                  )} />
                  <Controller name="supplierPO" control={control} render={({ field }) => (
                    <FormField label="PO Number">
                      <TextField {...field} placeholder="e.g. PO-987654"
                        size="small" fullWidth error={!!errors.supplierPO} helperText={errors.supplierPO?.message as string} sx={fieldSx} />
                    </FormField>
                  )} />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: { xs: 1.5, sm: 1.75 } }}>
                  <FormField label="PO Value">
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr) 92px', sm: 'minmax(0, 1fr) 100px' }, gap: 1 }}>
                      <Controller name="poValue" control={control} render={({ field }) => (
                        <TextField {...field} type="number" placeholder="0.00"
                          size="small" fullWidth error={!!errors.poValue} helperText={errors.poValue?.message as string} sx={fieldSx} />
                      )} />
                      <Controller name="poValueCurrency" control={control} render={({ field }) => (
                        <FormControl size="small" sx={selectSx}>
                          <Select {...field}>
                            {CURRENCY_LIST.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                          </Select>
                        </FormControl>
                      )} />
                    </Box>
                  </FormField>
                  <FormField label="Mode of Transport">
                    <FormControl size="small" fullWidth error={!!errors.mode} sx={selectSx}>
                      <Controller name="mode" control={control} render={({ field }) => (
                        <Select {...field} displayEmpty>
                          <MenuItem value="" disabled>Select mode</MenuItem>
                          {MODES_LIST.map(m => <MenuItem key={m.value} value={m.value}>{getModeIcon(m.value)} {m.label}</MenuItem>)}
                        </Select>
                      )} />
                      {errors.mode?.message && <FormHelperText>{errors.mode.message}</FormHelperText>}
                    </FormControl>
                  </FormField>
                  <FormField label="Incoterms">
                    <FormControl size="small" fullWidth error={!!errors.incoterms} sx={selectSx}>
                      <Controller name="incoterms" control={control} render={({ field }) => (
                        <Select {...field} displayEmpty>
                          <MenuItem value="" disabled>Select incoterms</MenuItem>
                          {INCOTERMS_LIST.map(i => <MenuItem key={i.value} value={i.value}>{i.label}</MenuItem>)}
                        </Select>
                      )} />
                      {errors.incoterms?.message && <FormHelperText>{errors.incoterms.message}</FormHelperText>}
                    </FormControl>
                  </FormField>
                </Box>
              </Stack>
            </Box>
          )}

          {sectionCard('Route & Cargo', Route, 'info.main',
            <Stack spacing={1.75}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 1.5, sm: 1.75 } }}>
                <Controller name="origin" control={control} render={({ field }) => (
                  <LocationPopover
                    value={field.value}
                    setValue={(v) => setValue('origin', v, { shouldValidate: true })}
                    label="Origin Port / City"
                    error={!!errors.origin}
                    helperText={errors.origin?.message as string}
                  />
                )} />
                <Controller name="destination" control={control} render={({ field }) => (
                  <LocationPopover
                    value={field.value}
                    setValue={(v) => setValue('destination', v, { shouldValidate: true })}
                    label="Destination Port / City"
                    error={!!errors.destination}
                    helperText={errors.destination?.message as string}
                  />
                )} />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: { xs: 1.5, sm: 1.75 } }}>
                <Controller name="size" control={control} render={({ field }) => (
                  <FormField label="Cargo Size / Type">
                    <TextField {...field} placeholder="e.g. 1x40 HQ, LCL" size="small" fullWidth error={!!errors.size} helperText={errors.size?.message as string} sx={fieldSx} />
                  </FormField>
                )} />
                <Controller name="transitTime" control={control} render={({ field }) => (
                  <FormField label="Transit Time">
                    <TextField {...field} placeholder="e.g. 25 Days" size="small" fullWidth sx={fieldSx} />
                  </FormField>
                )} />
                <Controller name="etd" control={control} render={({ field }) => (
                  <FormField label="ETD">
                    <TextField {...field} type="date" size="small" fullWidth sx={fieldSx} />
                  </FormField>
                )} />
                <Controller name="eta" control={control} render={({ field }) => (
                  <FormField label="ETA">
                    <TextField {...field} type="date" size="small" fullWidth sx={fieldSx} />
                  </FormField>
                )} />
              </Box>
            </Stack>
          )}

          {(validQuotesConverted.length > 0 || autoSavings !== null) && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.25 }}>
              {lowestAmountInPoCurrency > 0 && (
                <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'primary.light', bgcolor: 'rgba(15,118,110,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography variant="caption" color="primary.main" fontWeight={700}>Lowest Quote</Typography>
                  <Typography variant="h6" color="primary.main" fontWeight={800}>{poValueCurrency} {formatCurrency(lowestAmountInPoCurrency)}</Typography>
                </Box>
              )}
              {autoSavings !== null && (
                <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 1, border: '1px solid',
                  borderColor: autoSavings >= 0 ? 'success.main' : 'error.main',
                  bgcolor: autoSavings >= 0 ? 'rgba(22,130,86,0.04)' : 'rgba(194,65,45,0.04)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography variant="caption" color={autoSavings >= 0 ? 'success.main' : 'error'} fontWeight={700}>
                    {autoSavings >= 0 ? 'Total Savings' : 'Extra Cost'}
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color={autoSavings >= 0 ? 'success.main' : 'error'}>
                    {poValueCurrency} {formatCurrency(Math.abs(autoSavings))}
                  </Typography>
                </Box>
              )}
              {lowestAmountInPoCurrency > 0 && (
                <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'info.light', bgcolor: 'rgba(49,116,143,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography variant="caption" color="info.main" fontWeight={700}>Freight % of PO</Typography>
                  <Typography variant="h6" color="info.main" fontWeight={800}>{percentageValue}%</Typography>
                </Box>
              )}
            </Box>
          )}

          {sectionCard('Forwarder Quotes', AttachMoney, '#6366f1',
            <Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {fields.map((field, index) => {
                  const quoteRow = quotes?.[index];
                  const quoteForwarder = quoteRow?.forwarder ?? field.forwarder;
                  const quoteAmount = quoteRow?.quotedAmount ?? 0;
                  const quoteCurrency = quoteRow?.currency ?? 'AED';
                  const isAwarded = awardedTo === quoteForwarder;
                  const isLowest = quoteAmount > 0 && validQuotesConverted.length > 1 &&
                    convertCurrency(quoteAmount, quoteCurrency || 'AED', poValueCurrency) === lowestAmountInPoCurrency;

                  return (
                    <Paper key={field.id} variant="outlined" sx={{
                      p: { xs: 1.25, sm: 1.5 },
                      borderWidth: 1,
                      borderRadius: 1.5,
                      borderColor: isAwarded ? 'success.main' : isLowest ? 'primary.light' : 'divider',
                      bgcolor: isAwarded ? 'rgba(22,130,86,0.045)' : isLowest ? 'rgba(15,118,110,0.045)' : 'background.paper',
                    }}>
                      <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '32px minmax(0, 1fr)',
                          sm: '32px minmax(0, 1fr) 92px minmax(120px, 0.55fr) 36px',
                        },
                        gap: { xs: 1, sm: 1.25 },
                        alignItems: 'center',
                      }}>
                        <Box sx={{
                          width: 30, height: 30, minWidth: 30, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: 700,
                          bgcolor: isAwarded ? 'success.main' : isLowest ? 'primary.main' : 'action.disabledBackground',
                          color: isAwarded || isLowest ? '#fff' : 'text.secondary',
                        }}>
                          {index + 1}
                        </Box>
                        <Controller name={`quotes.${index}.forwarder`} control={control} render={({ field: fField }) => (
                          <FormControl size="small" fullWidth sx={selectSx}>
                            <Select {...fField} displayEmpty>
                              <MenuItem value="" disabled>Select Forwarder</MenuItem>
                              {forwarders.map(f => <MenuItem key={f.id} value={f.name}>{f.name}</MenuItem>)}
                            </Select>
                          </FormControl>
                        )} />
                        <Controller name={`quotes.${index}.currency`} control={control} render={({ field: cField }) => (
                          <FormControl size="small" sx={{ ...selectSx, gridColumn: { xs: '2', sm: 'auto' }, width: { xs: 96, sm: 'auto' } }}>
                            <Select {...cField}>
                              {CURRENCY_LIST.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                            </Select>
                          </FormControl>
                        )} />
                        <Controller name={`quotes.${index}.quotedAmount`} control={control} render={({ field: aField }) => (
                          <TextField {...aField} type="number" placeholder="Amount" size="small"
                            sx={{ ...fieldSx, gridColumn: { xs: '2', sm: 'auto' }, maxWidth: { xs: '100%', sm: 'none' } }}
                            inputProps={{ style: { fontFamily: 'monospace' } }} />
                        )} />
                        {fields.length > 1 && (
                          <IconButton size="small" color="error" onClick={() => remove(index)} aria-label={`Remove quote ${index + 1}`}
                            sx={{ justifySelf: { xs: 'end', sm: 'center' }, gridColumn: { xs: '2', sm: 'auto' } }}>
                            <Close fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                      {(isAwarded || isLowest) && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, ml: 5 }}>
                          {isAwarded ? (
                            <Chip icon={<Star />} label="Awarded Partner" size="small" color="warning" sx={{ fontWeight: 600 }} />
                          ) : (
                            <Chip label="Lowest Quote" size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
                          )}
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Box>
              <Button variant="outlined" startIcon={<Add />} onClick={handleAddForwarder}
                sx={{ mt: 2, borderStyle: 'dashed', borderWidth: 1.5, width: '100%', py: 1.25, borderColor: 'primary.light', color: 'primary.main', bgcolor: 'rgba(15,118,110,0.03)' }}>
                Add Another Quote
              </Button>
            </Box>
          )}

          {sectionCard('Award & Decision', EmojiEvents, 'success.main',
            <Stack spacing={1.75}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: { xs: 1.5, sm: 1.75 } }}>
                <FormField label="Quotation Status">
                  <FormControl size="small" fullWidth sx={selectSx}>
                    <Controller name="status" control={control} render={({ field }) => (
                      <Select {...field}>
                        {STATUS_LIST.filter(s => isAdmin || (s !== 'Awaiting Approval' && s !== 'Rejected')).map(s => (
                          <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))}
                      </Select>
                    )} />
                  </FormControl>
                </FormField>
                <FormField label="Awarded To Forwarder">
                  <FormControl size="small" fullWidth sx={selectSx}>
                    <Controller name="awardedTo" control={control} render={({ field }) => (
                      <Select {...field} value={field.value || 'none'}
                        onChange={e => field.onChange(e.target.value === 'none' ? '' : e.target.value)}>
                        <MenuItem value="none">No Award Chosen</MenuItem>
                        {forwarders.map(f => <MenuItem key={f.id} value={f.name}>{f.name}</MenuItem>)}
                      </Select>
                    )} />
                  </FormControl>
                </FormField>
                <FormField label={autoSavings !== null ? 'Savings Calculation' : 'Savings (Manual)'}>
                  {autoSavings !== null ? (
                    <TextField
                      value={`${poValueCurrency} ${formatCurrency(Math.abs(autoSavings))}`}
                      size="small"
                      fullWidth
                      InputProps={{ readOnly: true }}
                      sx={{
                        ...fieldSx,
                        '& .MuiOutlinedInput-root': {
                          bgcolor: autoSavings >= 0 ? 'rgba(22,130,86,0.05)' : 'rgba(194,65,45,0.05)',
                        },
                        '& .MuiInputBase-input': {
                          fontWeight: 700,
                          color: autoSavings >= 0 ? 'success.main' : 'error.main',
                        },
                      }}
                    />
                  ) : (
                    <Controller name="savings" control={control} render={({ field }) => (
                      <TextField {...field} type="number" placeholder="0.00" size="small" fullWidth sx={fieldSx} />
                    )} />
                  )}
                </FormField>
              </Box>
              <Controller name="remarks" control={control} render={({ field }) => (
                <FormField label="Remarks & Notes">
                  <TextField {...field} placeholder="Add any freight notes, special instructions..."
                    multiline rows={3} size="small" fullWidth inputProps={{ maxLength: 500 }} sx={fieldSx} />
                </FormField>
              )} />
            </Stack>
          )}
        </Box>

        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 1.5,
          flexDirection: { xs: 'column', sm: 'row' },
          py: { xs: 1.25, sm: 1.5 },
          px: { xs: 2, sm: 2.5 },
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          flexShrink: 0,
          position: 'sticky',
          bottom: 0,
          zIndex: 2,
          boxShadow: '0 -12px 24px -24px rgba(23,32,31,0.55)',
        }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            {submitError ? (
              <Alert severity="error" sx={{ py: 0, alignItems: 'center', '& .MuiAlert-message': { py: 0.5 } }}>
                {submitError}
              </Alert>
            ) : (
              <Typography variant="caption" color="text.secondary">
                {validQuotesConverted.length > 0 && `${validQuotesConverted.length} quote${validQuotesConverted.length !== 1 ? 's' : ''} entered`}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1.25, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="contained" startIcon={quotation ? <Check /> : <Add />} sx={{ px: 4 }}>
              {quotation ? 'Update Quotation' : 'Submit Quotation'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}
