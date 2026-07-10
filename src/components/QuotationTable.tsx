import { useState, useMemo, useCallback } from 'react';
import {
  STATUS_LIST, calculateAwardSavings, convertCurrency, ADMIN_EMAIL,
} from '../types';
import type { Quotation, Forwarder } from '../types';
import { useAuth } from '../auth';
import { getModeIcon, formatCurrency } from '@/lib/utils';
import {
  Alert, AlertTitle,
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Chip, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  Select, MenuItem, FormControl, Card, CardContent, Typography,
  useMediaQuery, useTheme,
} from '@mui/material';
import {
  Description, Schedule, Close as XCircle, Search, Download,
  Check, Star, Warning, Edit, Delete, Lock, Send,
  AttachMoney, ArrowForward, AccessTime, StarBorder, Inventory,
} from '@mui/icons-material';

const ENTITY_COLORS: Record<string, string> = {
  UAE: '#7c3aed',
  Qatar: '#2563eb',
  Oman: '#059669',
};

const STATUS_STYLE: Record<string, { color: string; bg: string; darkBg: string }> = {
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

function getStatusStyle(status: string, mode: 'light' | 'dark') {
  const style = STATUS_STYLE[status] || {
    color: '#66736f',
    bg: '#f5f5f4',
    darkBg: 'rgba(148,163,184,0.14)',
  };

  return {
    color: style.color,
    bg: mode === 'dark' ? style.darkBg : style.bg,
    border: mode === 'dark' ? `${style.color}66` : `${style.color}33`,
  };
}

const tableHeaderCellSx = {
  bgcolor: 'background.paper',
  borderBottom: '1px solid',
  borderColor: 'divider',
  boxShadow: '0 1px 0 rgba(23,32,31,0.08)',
  fontWeight: 800,
  fontSize: '0.6875rem',
  letterSpacing: '0.08em',
  lineHeight: 1.2,
  py: 1.25,
  position: 'sticky',
  textTransform: 'uppercase',
  top: 0,
  zIndex: 4,
};

const statusTabs = [
  {
    value: 0,
    label: 'Active',
    icon: Description,
    color: '#0f766e',
    bg: 'rgba(15,118,110,0.10)',
  },
  {
    value: 1,
    label: 'Awaiting Approval',
    icon: Schedule,
    color: '#b7791f',
    bg: 'rgba(183,121,31,0.12)',
  },
  {
    value: 2,
    label: 'Rejected',
    icon: XCircle,
    color: '#c2412d',
    bg: 'rgba(194,65,45,0.10)',
  },
  {
    value: 3,
    label: 'Delivered',
    icon: Inventory,
    color: '#168256',
    bg: 'rgba(22,130,86,0.10)',
  },
];

function displayName(value?: string) {
  if (!value) return '-';
  const name = value.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
  return name ? name.replace(/\b\w/g, char => char.toUpperCase()) : value;
}

function formatStamp(date?: string) {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function PersonStamp({ label, name, date }: { label: string; name?: string; date?: string }) {
  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 0.75,
      px: 1,
      py: 0.65,
      borderRadius: 1,
      border: '1px solid',
      borderColor: 'divider',
      bgcolor: 'background.paper',
      minWidth: 0,
      maxWidth: '100%',
    }}>
      <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ letterSpacing: 0, whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
      <Typography variant="caption" fontWeight={750} color="text.primary" sx={{ letterSpacing: 0 }}>
        {displayName(name)}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0, fontWeight: 600 }}>
        {formatStamp(date)}
      </Typography>
    </Box>
  );
}

function getEffectiveSavings(quotation: Quotation) {
  return calculateAwardSavings(
    quotation.quotes,
    quotation.poValueCurrency || 'AED',
    quotation.awardedTo
  ) ?? quotation.savings;
}

interface QuotationTableProps {
  quotations: Quotation[];
  forwarders: Forwarder[];
  onEdit: (quotation: Quotation) => void;
  onDelete: (id: number) => void;
  onAward: (id: number, forwarder: string) => void;
  onStatusChange: (id: number, status: string) => void;
  searchActive?: boolean;
}

export default function QuotationTable({ quotations, forwarders, onEdit, onDelete, onAward, onStatusChange, searchActive = false }: QuotationTableProps) {
  const [detailQuotation, setDetailQuotation] = useState<Quotation | null>(null);
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [activeTab, setActiveTab] = useState(0);
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const currentQuotation = detailQuotation
    ? (quotations.find(q => q.id === detailQuotation.id) || detailQuotation)
    : null;

  const pendingApprovalsCount = useMemo(() =>
    quotations.filter(q => q.status === 'Awaiting Approval').length,
    [quotations]
  );

  const activeCount = useMemo(() =>
    quotations.filter(q => q.status !== 'Awaiting Approval' && q.status !== 'Rejected' && q.status !== 'Delivered').length,
    [quotations]
  );

  const rejectedCount = useMemo(() =>
    quotations.filter(q => q.status === 'Rejected').length,
    [quotations]
  );

  const deliveredCount = useMemo(() =>
    quotations.filter(q => q.status === 'Delivered').length,
    [quotations]
  );

  const displayedQuotations = useMemo(() =>
    quotations.filter(q => {
      if (searchActive) return true;
      if (!isAdmin) return true;
      if (activeTab === 1) return q.status === 'Awaiting Approval';
      if (activeTab === 2) return q.status === 'Rejected';
      if (activeTab === 3) return q.status === 'Delivered';
      return q.status !== 'Awaiting Approval' && q.status !== 'Rejected' && q.status !== 'Delivered';
    }),
    [quotations, activeTab, isAdmin, searchActive]
  );

  const exportToExcel = useCallback(async () => {
    try {
      const XLSX = await import('xlsx');
      const data = displayedQuotations.map(q => {
        const savings = getEffectiveSavings(q);
        return {
          Entity: q.entity, Supplier: q.supplierName, 'PO Number': q.supplierPO,
          'PO Value (AED)': q.poValue, Origin: q.origin, Destination: q.destination,
          Mode: q.mode, Size: q.size, 'Transit Time': q.transitTime,
          ETD: q.etd, ETA: q.eta, Incoterms: q.incoterms,
          Status: q.status, 'Freight %': q.percentage, 'Savings (AED)': savings,
          'Awarded To': q.awardedTo || '-',
          ...forwarders.reduce((acc, f) => {
            const quote = q.quotes.find(qu => qu.forwarder === f.name);
            acc[f.name] = quote?.quotedAmount || 0;
            return acc;
          }, {} as Record<string, number>),
        };
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Quotations');
      XLSX.writeFile(wb, `Quotations_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Excel export failed:', err);
    }
  }, [displayedQuotations, forwarders]);

  return (
    <>
      <Box sx={{
        display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { sm: 'center' }, justifyContent: 'space-between',
        gap: 1.25, py: 1, px: 1.25, borderRadius: 1.5,
        border: '1px solid', borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: '0 10px 30px -28px rgba(23,32,31,0.45)',
      }}>
        <Box sx={{ minWidth: 0, width: { xs: '100%', sm: 'auto' } }}>
          {isAdmin && (
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 40,
                maxWidth: '100%',
                '& .MuiTabs-flexContainer': { gap: 0.75 },
                '& .MuiTabs-indicator': { display: 'none' },
                '& .MuiTab-root': {
                  minHeight: 38,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.25,
                  px: 1.25,
                  py: 0.5,
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: 'text.secondary',
                  bgcolor: 'background.paper',
                  textTransform: 'uppercase',
                },
              }}>
              {statusTabs.map(tab => {
                const Icon = tab.icon;
                const count = tab.value === 0 ? activeCount : tab.value === 1 ? pendingApprovalsCount : tab.value === 2 ? rejectedCount : deliveredCount;
                const isActive = activeTab === tab.value;
                return (
                  <Tab
                    key={tab.value}
                    value={tab.value}
                    icon={<Icon fontSize="small" />}
                    iconPosition="start"
                    sx={{
                      '&.Mui-selected': {
                        color: tab.color,
                        bgcolor: tab.bg,
                        borderColor: `${tab.color}55`,
                      },
                    }}
                    label={
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.65 }}>
                        {tab.label}
                        <Chip
                          label={count}
                          size="small"
                          sx={{
                            height: 20,
                            minWidth: 22,
                            fontSize: '0.625rem',
                            bgcolor: isActive ? tab.color : 'action.selected',
                            color: isActive ? '#fff' : 'text.secondary',
                            fontWeight: 800,
                          }}
                        />
                      </Box>
                    }
                  />
                );
              })}
            </Tabs>
          )}
        </Box>
        <Button variant="outlined" size="small" onClick={exportToExcel}
          startIcon={<Download />}
          sx={{ minHeight: 32, borderColor: 'divider', '&:hover': { borderColor: 'primary.main', color: 'primary.main' } }}>
          Export Excel
        </Button>
      </Box>

      {!isMobile && (
        <TableContainer component={Paper} variant="outlined" sx={{
          maxHeight: 'calc(100vh - 260px)',
          width: '100%',
          overflow: 'auto',
          borderRadius: 1.5,
          position: 'relative',
          '& .MuiTableCell-stickyHeader': tableHeaderCellSx,
          '&::-webkit-scrollbar': { height: 6, width: 6 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 },
        }}>
          <Table size="small" stickyHeader sx={{ minWidth: 1420 }}>
            <TableHead>
              <TableRow sx={{ height: 42 }}>
                <TableCell sx={{ ...tableHeaderCellSx, width: 32 }}></TableCell>
                <TableCell sx={tableHeaderCellSx}>Entity</TableCell>
                <TableCell sx={tableHeaderCellSx}>Supplier</TableCell>
                <TableCell sx={tableHeaderCellSx}>PO</TableCell>
                <TableCell align="right" sx={tableHeaderCellSx}>PO Value</TableCell>
                <TableCell sx={tableHeaderCellSx}>Origin</TableCell>
                <TableCell sx={tableHeaderCellSx}>Dest</TableCell>
                <TableCell sx={tableHeaderCellSx}>Mode</TableCell>
                <TableCell sx={tableHeaderCellSx}>Status</TableCell>
                <TableCell sx={tableHeaderCellSx}>ETD</TableCell>
                <TableCell sx={tableHeaderCellSx}>ETA</TableCell>
                <TableCell align="right" sx={tableHeaderCellSx}>Freight %</TableCell>
                <TableCell align="right" sx={tableHeaderCellSx}>Savings</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedQuotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} sx={{ textAlign: 'center', py: 6 }}>
                    <Search sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body1" fontWeight={600}>No quotations found</Typography>
                    <Typography variant="body2" color="text.secondary">Try adjusting your search or filters.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                displayedQuotations.map(q => {
                  const entityColor = ENTITY_COLORS[q.entity] || '#66736f';
                  const statusStyle = getStatusStyle(q.status, muiTheme.palette.mode);
                  const savings = getEffectiveSavings(q);
                  return (
                    <TableRow
                      key={q.id}
                      hover
                      sx={{ cursor: 'pointer', transition: 'all 0.15s', '&:hover td': { bgcolor: `${entityColor}08` } }}
                      onClick={() => setDetailQuotation(q)}
                    >
                      <TableCell>
                        <Box sx={{ width: 3, height: 20, borderRadius: 1.5, bgcolor: entityColor }} />
                      </TableCell>
                      <TableCell>
                        <Chip label={q.entity} size="small"
                          sx={{ fontWeight: 700, fontSize: '0.6875rem', bgcolor: `${entityColor}15`, color: entityColor }} />
                      </TableCell>
                      <TableCell><Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 140 }}>{q.supplierName}</Typography></TableCell>
                      <TableCell><Typography variant="body2" fontFamily="monospace" color="text.secondary">{q.supplierPO}</Typography></TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                          {formatCurrency(q.poValue)} <Typography component="span" variant="caption" color="text.secondary">{q.poValueCurrency || 'AED'}</Typography>
                        </Typography>
                      </TableCell>
                      <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 100 }}>{q.origin}</Typography></TableCell>
                      <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 100 }}>{q.destination}</Typography></TableCell>
                      <TableCell>
                        <Chip label={`${getModeIcon(q.mode)} ${q.mode}`} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        {q.status === 'Awaiting Approval' && isAdmin ? (
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Button size="small" variant="contained" color="success"
                              sx={{ minWidth: 'auto', height: 24, fontSize: '0.6875rem', px: 1 }}
                              onClick={() => onStatusChange(q.id, 'Assign to forwarder')}>
                              Approve
                            </Button>
                            <Button size="small" variant="contained" color="error"
                              sx={{ minWidth: 'auto', height: 24, fontSize: '0.6875rem', px: 1 }}
                              onClick={() => onStatusChange(q.id, 'Rejected')}>
                              Reject
                            </Button>
                          </Box>
                        ) : isAdmin ? (
                          <FormControl size="small" sx={{ minWidth: 168 }}>
                            <Select
                              value={q.status}
                              onChange={(e) => onStatusChange(q.id, e.target.value)}
                              sx={{
                                height: 30,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: statusStyle.color,
                                bgcolor: statusStyle.bg,
                                borderRadius: 1.25,
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: statusStyle.border,
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: statusStyle.color,
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  borderColor: statusStyle.color,
                                },
                                '& .MuiSelect-icon': {
                                  color: statusStyle.color,
                                },
                              }}
                            >
                              {STATUS_LIST.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                            </Select>
                          </FormControl>
                        ) : (
                          <Chip label={q.status} size="small"
                            sx={{ fontWeight: 600, fontSize: '0.75rem', bgcolor: statusStyle.bg, color: statusStyle.color }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" color="text.secondary" noWrap>
                          {q.etd || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" color="text.secondary" noWrap>
                          {q.eta || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontFamily="monospace" fontWeight={600}>{Number.isFinite(q.percentage) ? q.percentage : 0}%</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600} fontFamily="monospace"
                          color={savings < 0 ? 'error' : 'success.main'}>
                          {savings !== 0 ? (
                            <>{formatCurrency(Math.abs(savings))} {q.poValueCurrency || 'AED'}</>
                          ) : '-'}
                        </Typography>
                        {savings !== 0 && (q.poValueCurrency || 'AED') !== 'AED' && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            AED {formatCurrency(convertCurrency(Math.abs(savings), q.poValueCurrency || 'AED', 'AED'))}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {isMobile && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {displayedQuotations.length === 0 ? (
            <Card sx={{ textAlign: 'center', py: 6 }}>
              <CardContent>
                <Search sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body1" fontWeight={600}>No quotations found</Typography>
                <Typography variant="body2" color="text.secondary">Try adjusting your search or filters.</Typography>
              </CardContent>
            </Card>
          ) : (
            displayedQuotations.map(q => {
              const entityColor = ENTITY_COLORS[q.entity] || '#66736f';
                  const statusStyle = getStatusStyle(q.status, muiTheme.palette.mode);
              const savings = getEffectiveSavings(q);
              return (
                <Card key={q.id} sx={{
                  cursor: 'pointer', borderRadius: 1.5, overflow: 'hidden',
                  transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-1px)' },
                }}
                  onClick={() => setDetailQuotation(q)}>
                  <Box sx={{ height: 4, background: `linear-gradient(90deg, ${entityColor}, ${entityColor}88)` }} />
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Chip label={q.entity} size="small"
                        sx={{ fontWeight: 700, fontSize: '0.6875rem', bgcolor: `${entityColor}15`, color: entityColor }} />
                      {q.status === 'Awaiting Approval' && isAdmin ? (
                        <Box sx={{ display: 'flex', gap: 0.5 }} onClick={e => e.stopPropagation()}>
                          <Button size="small" variant="contained" color="success" sx={{ minWidth: 'auto', height: 24, fontSize: '0.6875rem', px: 1 }}
                            onClick={() => onStatusChange(q.id, 'Assign to forwarder')}>Approve</Button>
                          <Button size="small" variant="contained" color="error" sx={{ minWidth: 'auto', height: 24, fontSize: '0.6875rem', px: 1 }}
                            onClick={() => onStatusChange(q.id, 'Rejected')}>Reject</Button>
                        </Box>
                      ) : (
                        <Chip label={q.status} size="small"
                          sx={{ fontWeight: 600, fontSize: '0.75rem', bgcolor: statusStyle.bg, color: statusStyle.color }} />
                      )}
                    </Box>
                    <Typography variant="subtitle1" fontWeight={600}>{q.supplierName}</Typography>
                    <Typography variant="body2" fontFamily="monospace" color="text.secondary">{q.supplierPO}</Typography>
                    <Typography variant="h6" fontWeight={700}>
                      {formatCurrency(q.poValue)} <Typography component="span" variant="caption" color="text.secondary">{q.poValueCurrency || 'AED'}</Typography>
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', my: 1 }}>
                      <Typography variant="body2">{q.origin}</Typography>
                      <ArrowForward fontSize="small" color="action" />
                      <Typography variant="body2">{q.destination}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                      <Chip label={`${getModeIcon(q.mode)} ${q.mode}`} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />
                      <Chip label={q.incoterms} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />
                      {q.transitTime && (
                        <Chip icon={<AccessTime />} label={q.transitTime} size="small"
                          sx={{ fontSize: '0.75rem', color: '#fff', bgcolor: '#6366f1' }} />
                      )}
                    </Box>
                    {savings !== 0 && (
                      <Typography variant="body2" fontWeight={600} color={savings < 0 ? 'error' : 'success.main'}
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                        <AttachMoney fontSize="small" />
                        {savings < 0 ? 'Extra Cost' : 'Savings'}: {q.poValueCurrency || 'AED'} {formatCurrency(Math.abs(savings))}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" fontWeight={700} color="text.secondary">
                        Freight %: {Number.isFinite(q.percentage) ? q.percentage : 0}%
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {!isAdmin && q.status === 'Awaiting Approval' ? (
                          <Button size="small" variant="outlined" disabled startIcon={<Lock />}>Under Review</Button>
                        ) : (
                          <Button size="small" variant="outlined" startIcon={<Edit />}
                            onClick={(e) => { e.stopPropagation(); onEdit(q); }}>Edit</Button>
                        )}
                        {isAdmin && (
                          <Button size="small" variant="outlined" color="error" startIcon={<Delete />}
                            onClick={(e) => { e.stopPropagation(); onDelete(q.id); }}>Delete</Button>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })
          )}
        </Box>
      )}

      <Dialog open={!!currentQuotation} onClose={() => setDetailQuotation(null)} maxWidth="md" fullWidth
        sx={{ '& .MuiDialog-paper': { borderRadius: 2, overflow: 'hidden' } }}>
        {currentQuotation && (() => {
          const dq = currentQuotation;
          const entityColor = ENTITY_COLORS[dq.entity] || '#66736f';
          const statusStyle = getStatusStyle(dq.status, muiTheme.palette.mode);
          const savings = getEffectiveSavings(dq);
          return (
            <>
              <Box sx={{ height: 4, background: `linear-gradient(90deg, ${entityColor}, ${entityColor}88)` }} />
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
                <Chip label={dq.entity} size="small"
                  sx={{ fontWeight: 700, fontSize: '0.6875rem', bgcolor: `${entityColor}15`, color: entityColor }} />
                <Typography variant="subtitle1" component="span" fontWeight={700}>{dq.supplierName}</Typography>
                <Typography variant="body2" fontFamily="monospace" color="text.secondary">{dq.supplierPO}</Typography>
              </DialogTitle>
              <DialogContent>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 1.5, mb: 2.5 }}>
                  <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: `${entityColor}08`, border: '1px solid', borderColor: `${entityColor}20` }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>PO Value</Typography>
                    <Typography variant="body1" fontWeight={700} sx={{ color: entityColor }}>{dq.poValueCurrency || 'AED'} {formatCurrency(dq.poValue)}</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'rgba(99,102,241,0.06)', border: '1px solid', borderColor: 'rgba(99,102,241,0.2)' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>Freight %</Typography>
                    <Typography variant="body1" fontWeight={700} color="#6366f1">{Number.isFinite(dq.percentage) ? dq.percentage : 0}%</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: savings < 0 ? 'rgba(220,38,38,0.06)' : 'rgba(5,150,105,0.06)', border: '1px solid', borderColor: savings < 0 ? 'rgba(220,38,38,0.2)' : 'rgba(5,150,105,0.2)' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>{savings < 0 ? 'Extra Cost' : 'Savings'}</Typography>
                    <Typography variant="body1" fontWeight={700} color={savings < 0 ? '#dc2626' : '#059669'}>
                      {savings !== 0 ? `${dq.poValueCurrency || 'AED'} ${formatCurrency(Math.abs(savings))}` : '-'}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: statusStyle.bg, border: '1px solid', borderColor: statusStyle.border }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>Status</Typography>
                    <Box sx={{ mt: 0.5 }}><Chip label={dq.status} size="small"
                      sx={{ fontWeight: 600, bgcolor: statusStyle.bg, color: statusStyle.color }} /></Box>
                  </Box>
                </Box>

                {dq.status === 'Rejected' && dq.remarks && (
                  <Alert severity="error" sx={{ mb: 2.5 }}>
                    <AlertTitle>Rejection Reason</AlertTitle>
                    {dq.remarks}
                  </Alert>
                )}

                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover', mb: 2.5, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 2, borderRadius: 1.5 }}>
                  <Box><Typography variant="caption" color="text.secondary" fontWeight={700}>Origin</Typography>
                    <Typography variant="body2" fontWeight={500}>{dq.origin || '-'}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary" fontWeight={700}>Destination</Typography>
                    <Typography variant="body2" fontWeight={500}>{dq.destination || '-'}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary" fontWeight={700}>Mode</Typography>
                    <Typography variant="body2" fontWeight={500}>{getModeIcon(dq.mode)} {dq.mode || '-'}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary" fontWeight={700}>Size</Typography>
                    <Typography variant="body2" fontWeight={500}>{dq.size || '-'}</Typography></Box>
                  {dq.transitTime && <Box><Typography variant="caption" color="text.secondary" fontWeight={700}>Transit</Typography>
                    <Typography variant="body2" fontWeight={500}>{dq.transitTime}</Typography></Box>}
                  <Box><Typography variant="caption" color="text.secondary" fontWeight={700}>Incoterms</Typography>
                    <Typography variant="body2" fontWeight={500}>{dq.incoterms || '-'}</Typography></Box>
                  {dq.etd && <Box><Typography variant="caption" color="text.secondary" fontWeight={700}>ETD</Typography>
                    <Typography variant="body2" fontWeight={500}>{dq.etd}</Typography></Box>}
                  {dq.eta && <Box><Typography variant="caption" color="text.secondary" fontWeight={700}>ETA</Typography>
                    <Typography variant="body2" fontWeight={500}>{dq.eta}</Typography></Box>}
                </Paper>

                <Box sx={{ mb: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 24, height: 24, borderRadius: 0.5, bgcolor: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <AttachMoney sx={{ fontSize: 14 }} />
                      </Box>
                      <Typography variant="subtitle2" fontWeight={700}>Forwarder Quotes</Typography>
                    </Box>
                    {savings !== 0 && (
                      <Chip label={`${savings < 0 ? 'Extra Cost' : 'Savings'}: ${dq.poValueCurrency || 'AED'} ${formatCurrency(Math.abs(savings))}`}
                        size="small" color={savings < 0 ? 'error' : 'success'} sx={{ fontWeight: 600 }} />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {dq.quotes.filter(qt => qt.quotedAmount > 0).map(qt => (
                      <Paper key={qt.forwarder} variant="outlined" sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, px: 2, py: 1.5,
                        borderColor: dq.awardedTo === qt.forwarder ? '#059669' : 'divider',
                        bgcolor: dq.awardedTo === qt.forwarder ? 'rgba(5,150,105,0.04)' : 'background.paper',
                        borderWidth: dq.awardedTo === qt.forwarder ? 2 : 1,
                        opacity: dq.awardedTo && dq.awardedTo !== qt.forwarder ? 0.6 : 1,
                      }}>
                        <Typography variant="body2" fontWeight={600}>{qt.forwarder}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Typography variant="body2" fontWeight={700}>{qt.currency || 'AED'} {formatCurrency(qt.quotedAmount)}</Typography>
                          {!(!isAdmin && (dq.status === 'Awaiting Approval' || dq.status === 'Rejected')) && (
                            <Button
                              size="small"
                              variant={dq.awardedTo === qt.forwarder ? 'contained' : 'outlined'}
                              color={dq.awardedTo === qt.forwarder ? 'success' : 'primary'}
                              sx={{ minWidth: 'auto', height: 24, fontSize: '0.6875rem' }}
                              onClick={() => onAward(dq.id, qt.forwarder)}
                              startIcon={dq.awardedTo === qt.forwarder ? <Star /> : <StarBorder />}
                            >
                              {dq.awardedTo === qt.forwarder ? 'Awarded' : 'Award'}
                            </Button>
                          )}
                        </Box>
                      </Paper>
                    ))}
                    {dq.quotes.filter(qt => qt.quotedAmount > 0).length === 0 && (
                      <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>No quotes yet</Typography>
                    )}
                  </Box>
                </Box>

                {dq.remarks && (
                  <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover', mb: 1.25, display: 'flex', gap: 1, borderRadius: 1.5 }}>
                    <Send fontSize="small" color="action" sx={{ mt: 0.25 }} />
                    <Typography variant="body2" color="text.secondary">{dq.remarks}</Typography>
                  </Paper>
                )}

                <Box sx={{
                  mb: 2.5,
                  display: 'flex',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 1,
                  flexWrap: 'wrap',
                }}>
                  <PersonStamp label="Created by" name={dq.createdBy} date={dq.createdAt} />
                  <PersonStamp label="Approved by" name={dq.approvedBy} date={dq.approvedAt} />
                </Box>

                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap',
                  gap: 1,
                  pt: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  '& .MuiButton-root': {
                    height: 36,
                    alignSelf: 'center',
                  },
                }}>
                  {dq.status === 'Awaiting Approval' && isAdmin && (
                    <>
                      {!dq.awardedTo && (
                        <Typography variant="caption" color="warning.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 'auto' }}>
                          <Warning fontSize="small" /> Award a quote before approving
                        </Typography>
                      )}
                      <Button variant="contained" color="success" size="small" disabled={!dq.awardedTo}
                        startIcon={<Check />} onClick={() => { onStatusChange(dq.id, 'Assign to forwarder'); setDetailQuotation(null); }}>
                        Approve
                      </Button>
                      <Button variant="contained" color="error" size="small"
                        startIcon={<XCircle />} onClick={() => { onStatusChange(dq.id, 'Rejected'); setDetailQuotation(null); }}>
                        Reject
                      </Button>
                    </>
                  )}
                  {(dq.status === 'Pending' || dq.status === 'Sent for quotation') && dq.quotes.some(q => q.quotedAmount > 0) && (
                    <Button variant="contained" color="warning" size="small"
                      startIcon={<Send />} onClick={() => { onStatusChange(dq.id, 'Awaiting Approval'); setDetailQuotation(null); }}>
                      Submit for Approval
                    </Button>
                  )}
                  <Button variant="outlined" size="small" sx={{ minWidth: 84 }} onClick={() => setDetailQuotation(null)}>Close</Button>
                  {!isAdmin && dq.status === 'Awaiting Approval' ? (
                    <Button variant="outlined" size="small" disabled startIcon={<Lock />}>Under Review</Button>
                  ) : (
                    <Button variant="outlined" size="small" startIcon={<Edit />}
                      onClick={() => { setDetailQuotation(null); onEdit(dq); }}>Edit</Button>
                  )}
                  {isAdmin && (
                    <Button variant="outlined" color="error" size="small" startIcon={<Delete />}
                      onClick={() => { setDetailQuotation(null); onDelete(dq.id); }}>Delete</Button>
                  )}
                </Box>
              </DialogContent>
            </>
          );
        })()}
      </Dialog>
    </>
  );
}
