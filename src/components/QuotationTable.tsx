import React, { useState, useMemo, useCallback } from 'react';
import { FileText, Clock, XCircle, Search, Info, Download, Check, Star, AlertTriangle, Edit, Trash2, Lock, Send, Mail, DollarSign, ArrowRight, Clock3 } from 'lucide-react';
import { STATUS_LIST, convertCurrency } from '../types';
import { ADMIN_EMAIL } from '../types';
import type { Quotation, Forwarder } from '../types';
import { useAuth } from '../auth';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { cn, getModeIcon, formatCurrency } from '@/lib/utils';

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Pending':                { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  'Sent for quotation':     { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
  'Awaiting Approval':      { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/30' },
  'Assign to forwarder':    { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/30' },
  'In Transit':             { bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/30' },
  'Arrived Awaiting Clearance': { bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500/30' },
  'Under Clearance':        { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30' },
  'Delivered':              { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
  'Rejected':               { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/30' },
};

function getStatusStyle(status: string) {
  return STATUS_STYLES[status] ?? { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };
}

interface QuotationTableProps {
  quotations: Quotation[];
  forwarders: Forwarder[];
  onEdit: (quotation: Quotation) => void;
  onDelete: (id: number) => void;
  onAward: (id: number, forwarder: string) => void;
  onStatusChange: (id: number, status: string) => void;
}

const getEntityVariant = (entity: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' => {
  if (entity === 'UAE') return 'default';
  if (entity === 'Qatar') return 'info';
  if (entity === 'Oman') return 'success';
  if (entity === 'KSA') return 'warning';
  return 'secondary';
};

const EmptyState = () => (
  <div className="text-center py-[60px] px-5 text-muted-foreground flex flex-col items-center justify-center">
    <Search className="h-12 w-12 mb-4 text-muted-foreground" />
    <div className="text-[15px] font-medium">No quotations found</div>
  </div>
);

const QuotationTable = React.memo(function QuotationTable({ quotations, forwarders, onEdit, onDelete, onAward, onStatusChange }: QuotationTableProps) {
  const [detailQuotation, setDetailQuotation] = useState<Quotation | null>(null);
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'rejected'>('active');

  const currentQuotation = detailQuotation
    ? (quotations.find(q => q.id === detailQuotation.id) || detailQuotation)
    : null;

  const pendingApprovalsCount = useMemo(() =>
    quotations.filter(q => q.status === 'Awaiting Approval').length,
    [quotations]
  );

  const rejectedCount = useMemo(() =>
    quotations.filter(q => q.status === 'Rejected').length,
    [quotations]
  );

  const displayedQuotations = useMemo(() =>
    quotations.filter(q => {
      if (!isAdmin) return true;
      if (activeTab === 'pending') return q.status === 'Awaiting Approval';
      if (activeTab === 'rejected') return q.status === 'Rejected';
      return q.status !== 'Awaiting Approval' && q.status !== 'Rejected';
    }),
    [quotations, activeTab, isAdmin]
  );

  const exportToExcel = useCallback(async () => {
    try {
      const XLSX = await import('xlsx');
      const data = displayedQuotations.map(q => ({
        Entity: q.entity,
        Supplier: q.supplierName,
        'PO Number': q.supplierPO,
        'PO Value (AED)': q.poValue,
        Origin: q.origin,
        Destination: q.destination,
        Mode: q.mode,
        Size: q.size,
        'Transit Time': q.transitTime,
        ETD: q.etd,
        ETA: q.eta,
        Incoterms: q.incoterms,
        Status: q.status,
        'Freight %': q.percentage,
        'Savings (AED)': q.savings,
        'Awarded To': q.awardedTo || '-',
        ...forwarders.reduce((acc, f) => {
          const quote = q.quotes.find(qu => qu.forwarder === f.name);
          acc[f.name] = quote?.quotedAmount || 0;
          return acc;
        }, {} as Record<string, number>),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Quotations');
      XLSX.writeFile(wb, `Quotations_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Excel export failed:', err);
    }
  }, [displayedQuotations, forwarders]);

  const handleRowKeyDown = useCallback((e: React.KeyboardEvent, q: Quotation) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setDetailQuotation(q);
    }
  }, []);

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 py-3">
        <div>
          {isAdmin && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'pending' | 'rejected')}>
              <TabsList>
                <TabsTrigger value="active" className="gap-1.5">
                  <FileText className="h-4 w-4" />
                  <span>Active</span>
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>Awaiting Approval</span>
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{pendingApprovalsCount}</Badge>
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-1.5">
                  <XCircle className="h-4 w-4" />
                  <span>Rejected</span>
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{rejectedCount}</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
          <Download className="h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {/* Desktop Table */}
      <div className="max-[900px]:hidden rounded-xl border bg-card shadow -mx-5 w-[calc(100%+40px)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[32px]"></TableHead>
              <TableHead data-col="entity">Entity</TableHead>
              <TableHead data-col="supplier">Supplier</TableHead>
              <TableHead data-col="po">PO</TableHead>
              <TableHead data-col="value" className="text-right">PO Value</TableHead>
              <TableHead data-col="origin">Origin</TableHead>
              <TableHead data-col="dest">Dest</TableHead>
              <TableHead data-col="mode">Mode</TableHead>
              <TableHead data-col="status">Status</TableHead>
              <TableHead data-col="pct" className="text-right">%</TableHead>
              <TableHead data-col="savings" className="text-right">Savings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedQuotations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11}>
                  <EmptyState />
                </TableCell>
              </TableRow>
            ) : (
              displayedQuotations.map((q) => (
                <TableRow
                  key={q.id}
                  className="cursor-pointer hover:bg-primary/5"
                  onClick={() => setDetailQuotation(q)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => handleRowKeyDown(e, q)}
                  aria-label={`View quotation from ${q.supplierName}`}
                >
                  <TableCell>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <Badge variant={getEntityVariant(q.entity)} className="text-[11px] uppercase">
                      {q.entity}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-[13px] max-w-[140px] overflow-hidden text-ellipsis">{q.supplierName}</TableCell>
                  <TableCell className="font-mono text-xs">{q.supplierPO}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-[13px]">
                    {formatCurrency(q.poValue)} <span className="text-[10px] text-muted-foreground font-normal">{q.poValueCurrency || 'AED'}</span>
                  </TableCell>
                  <TableCell className="text-[13px]">{q.origin}</TableCell>
                  <TableCell className="text-[13px]">{q.destination}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-[7px] py-[2px] rounded text-[12px] bg-muted">
                      {getModeIcon(q.mode)} {q.mode}
                    </span>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    {q.status === 'Awaiting Approval' && isAdmin ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="success" className="h-6 px-2 text-[11px]" onClick={() => onStatusChange(q.id, 'Assign to forwarder')}>
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="h-6 px-2 text-[11px]" onClick={() => onStatusChange(q.id, 'Rejected')}>
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <Select
                        value={q.status}
                        onValueChange={(value) => onStatusChange(q.id, value)}
                        disabled={!isAdmin}
                      >
                        <SelectTrigger className={cn("h-7 text-[12px] w-auto min-w-[120px]", getStatusStyle(q.status).bg, getStatusStyle(q.status).text, getStatusStyle(q.status).border, "border")} onClick={e => e.stopPropagation()}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_LIST.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {Number.isFinite(q.percentage) ? q.percentage : 0}%
                  </TableCell>
                  <TableCell className={`text-right font-mono font-semibold ${q.savings < 0 ? 'text-destructive' : 'text-success'}`}>
                    <div>{q.savings !== 0 ? formatCurrency(Math.abs(q.savings)) : '-'} {q.savings !== 0 && <span className={`text-[10px] font-normal ${q.savings < 0 ? 'text-destructive' : 'text-success'}`}>{q.poValueCurrency || 'AED'}</span>}</div>
                    {q.savings !== 0 && (q.poValueCurrency || 'AED') !== 'AED' && (
                      <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                        AED {formatCurrency(convertCurrency(Math.abs(q.savings), q.poValueCurrency || 'AED', 'AED'))}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="min-[901px]:hidden flex flex-col gap-3">
        {displayedQuotations.length === 0 ? (
          <EmptyState />
        ) : (
          displayedQuotations.map((q) => (
            <Card
              key={q.id}
              className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg"
              onClick={() => setDetailQuotation(q)}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => handleRowKeyDown(e, q)}
              aria-label={`View quotation from ${q.supplierName}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={getEntityVariant(q.entity)} className="text-[11px] uppercase">{q.entity}</Badge>
                  {q.status === 'Awaiting Approval' && isAdmin ? (
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="success" className="h-6 px-2.5 text-[11px]" onClick={() => onStatusChange(q.id, 'Assign to forwarder')}>Approve</Button>
                      <Button size="sm" variant="destructive" className="h-6 px-2.5 text-[11px]" onClick={() => onStatusChange(q.id, 'Rejected')}>Reject</Button>
                    </div>
                  ) : (
                    <Select
                      value={q.status}
                      onValueChange={(value) => onStatusChange(q.id, value)}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger className={cn("h-7 text-[12px] w-auto min-w-[120px]", getStatusStyle(q.status).bg, getStatusStyle(q.status).text, getStatusStyle(q.status).border, "border")} onClick={e => e.stopPropagation()}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_LIST.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="text-base font-semibold mb-1">{q.supplierName}</div>
                <div className="font-mono text-xs text-muted-foreground mb-1">{q.supplierPO}</div>
                <div className="text-lg font-bold">{formatCurrency(q.poValue)} <span className="text-xs font-normal text-muted-foreground">{q.poValueCurrency || 'AED'}</span></div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground my-2">
                  <span>{q.origin}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span>{q.destination}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-[7px] py-[2px] rounded text-[12px] bg-muted">{getModeIcon(q.mode)} {q.mode}</span>
                  <span className="inline-flex items-center px-[7px] py-[2px] rounded text-[12px] bg-muted">{q.incoterms}</span>
                  {q.transitTime && (
                    <span className="inline-flex items-center gap-1 px-2 py-[2px] rounded text-[12px] bg-info/10 text-info">
                      <Clock3 className="h-3 w-3" />
                      <span>{q.transitTime}</span>
                    </span>
                  )}
                </div>
                {q.savings !== 0 && (
                  <div className={`text-sm font-semibold mt-2 flex items-center gap-1.5 ${q.savings < 0 ? 'text-destructive' : 'text-success'}`}>
                    <DollarSign className={`h-3.5 w-3.5 ${q.savings < 0 ? 'text-destructive' : 'text-success'}`} />
                    <span>
                      {q.savings < 0 ? 'Extra Cost' : 'Savings'}: {q.poValueCurrency || 'AED'} {formatCurrency(Math.abs(q.savings))}
                      {(q.poValueCurrency || 'AED') !== 'AED' && ` (AED ${formatCurrency(convertCurrency(Math.abs(q.savings), q.poValueCurrency || 'AED', 'AED'))})`}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-sm font-semibold text-muted-foreground">{Number.isFinite(q.percentage) ? q.percentage : 0}%</span>
                  <div className="flex items-center gap-2">
                    {!isAdmin && q.status === 'Awaiting Approval' ? (
                      <Button variant="outline" size="sm" disabled className="gap-1.5 h-7 px-3 text-xs">
                        <Lock className="h-3.5 w-3.5" />
                        Under Review
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="gap-1.5 h-7 px-3 text-xs" onClick={(e) => { e.stopPropagation(); onEdit(q); }}>
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    )}
                    {isAdmin && (
                      <Button variant="destructive" size="sm" className="gap-1.5 h-7 px-3 text-xs" onClick={(e) => { e.stopPropagation(); onDelete(q.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!currentQuotation} onOpenChange={(open) => { if (!open) setDetailQuotation(null); }}>
        <DialogContent className="max-w-[820px] max-h-[90vh] overflow-y-auto">
          {currentQuotation && (() => {
            const dq = currentQuotation;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <Badge variant={getEntityVariant(dq.entity)} className="text-[11px] uppercase">{dq.entity}</Badge>
                    <span>{dq.supplierName}</span>
                    <span className="font-mono text-sm text-muted-foreground">{dq.supplierPO}</span>
                  </DialogTitle>
                </DialogHeader>

                <div className="p-1">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">PO Value</div>
                      <div className="text-base font-bold">{dq.poValueCurrency || 'AED'} {formatCurrency(dq.poValue)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Freight %</div>
                      <div className="text-base font-bold text-primary">{Number.isFinite(dq.percentage) ? dq.percentage : 0}%</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{dq.savings < 0 ? 'Extra Cost' : 'Savings'}</div>
                      <div className={`text-base font-bold ${dq.savings < 0 ? 'text-destructive' : 'text-success'}`}>
                        {dq.savings !== 0 ? (
                          <>
                            {dq.poValueCurrency || 'AED'} {formatCurrency(Math.abs(dq.savings))}
                            {(dq.poValueCurrency || 'AED') !== 'AED' && (
                              <span className="text-xs text-muted-foreground font-normal ml-1.5">
                                (AED {formatCurrency(convertCurrency(Math.abs(dq.savings), dq.poValueCurrency || 'AED', 'AED'))})
                              </span>
                            )}
                          </>
                        ) : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Status</div>
                      {dq.status === 'Awaiting Approval' && isAdmin ? (
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="success" className="h-7 px-2 text-[11px]" onClick={() => {
                            onStatusChange(dq.id, 'Assign to forwarder');
                            setDetailQuotation(prev => prev ? { ...prev, status: 'Assign to forwarder' } : null);
                          }}>Approve</Button>
                          <Button size="sm" variant="destructive" className="h-7 px-2 text-[11px]" onClick={() => {
                            onStatusChange(dq.id, 'Rejected');
                            setDetailQuotation(prev => prev ? { ...prev, status: 'Rejected' } : null);
                          }}>Reject</Button>
                        </div>
                      ) : (
                        <Select
                          value={dq.status}
                          onValueChange={(value) => {
                            onStatusChange(dq.id, value);
                            setDetailQuotation(prev => prev ? { ...prev, status: value } : null);
                          }}
                          disabled={!isAdmin}
                        >
                          <SelectTrigger className={cn("h-8 text-[12px] w-auto min-w-[140px]", getStatusStyle(dq.status).bg, getStatusStyle(dq.status).text, getStatusStyle(dq.status).border, "border")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_LIST.map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  {dq.status === 'Rejected' && dq.remarks && (
                    <Alert variant="destructive" className="mb-5">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Rejection Reason</AlertTitle>
                      <AlertDescription>{dq.remarks}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5 p-3 bg-muted rounded-lg">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Origin</div>
                      <div className="text-sm font-medium">{dq.origin || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Destination</div>
                      <div className="text-sm font-medium">{dq.destination || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Mode</div>
                      <div className="text-sm font-medium">{getModeIcon(dq.mode)} {dq.mode || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Size</div>
                      <div className="text-sm font-medium">{dq.size || '-'}</div>
                    </div>
                    {dq.transitTime && (
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Transit</div>
                        <div className="text-sm font-medium">{dq.transitTime}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Incoterms</div>
                      <div className="text-sm font-medium">{dq.incoterms || '-'}</div>
                    </div>
                    {dq.etd && (
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">ETD</div>
                        <div className="text-sm font-medium">{dq.etd}</div>
                      </div>
                    )}
                    {dq.eta && (
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">ETA</div>
                        <div className="text-sm font-medium">{dq.eta}</div>
                      </div>
                    )}
                  </div>

                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold m-0">Forwarder Quotes</h3>
                      {dq.savings !== 0 && (
                        <Badge variant={dq.savings < 0 ? 'destructive' : 'success'} className="text-[11px]">
                          {dq.savings < 0 ? 'Extra Cost' : 'Savings'}: {dq.poValueCurrency || 'AED'} {formatCurrency(Math.abs(dq.savings))}
                          {(dq.poValueCurrency || 'AED') !== 'AED' && ` (AED ${formatCurrency(convertCurrency(Math.abs(dq.savings), dq.poValueCurrency || 'AED', 'AED'))})`}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {dq.quotes.filter(qt => qt.quotedAmount > 0).map(qt => (
                        <div
                          key={qt.forwarder}
                          className={cn(
                            "flex items-center justify-between px-4 py-2.5 rounded-lg border transition-all",
                            dq.awardedTo === qt.forwarder
                              ? "border-success bg-success/10"
                              : dq.awardedTo
                                ? "border-border bg-muted opacity-60"
                                : "border-border bg-card"
                          )}
                        >
                          <span className="text-sm font-semibold">{qt.forwarder}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold">{qt.currency || 'AED'} {formatCurrency(qt.quotedAmount)}</span>
                            {(!(!isAdmin && (dq.status === 'Awaiting Approval' || dq.status === 'Rejected'))) && (
                              <Button
                                variant={dq.awardedTo === qt.forwarder ? "success" : "outline"}
                                size="sm"
                                className="h-6 px-3 text-[11px] rounded-full"
                                onClick={() => onAward(dq.id, qt.forwarder)}
                              >
                                {dq.awardedTo === qt.forwarder ? (
                                  <><Star className="h-3.5 w-3.5 text-warning fill-warning" /> Awarded</>
                                ) : (
                                  <><Star className="h-3.5 w-3.5" /> Award</>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      {dq.quotes.filter(qt => qt.quotedAmount > 0).length === 0 && (
                        <div className="text-center py-6 text-sm text-muted-foreground">No quotes yet</div>
                      )}
                    </div>
                  </div>

                  {dq.remarks && (
                    <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground mb-5 flex items-start gap-2">
                      <Mail className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{dq.remarks}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-3 border-t border-border">
                    {dq.status === 'Awaiting Approval' && isAdmin && (
                      <>
                        {!dq.awardedTo && (
                          <span className="text-[11px] flex items-center gap-1.5 mr-auto self-center font-medium text-warning">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Award a quote above before approving</span>
                          </span>
                        )}
                        <Button
                          variant="success"
                          size="sm"
                          disabled={!dq.awardedTo}
                          className="gap-1.5"
                          onClick={() => {
                            onStatusChange(dq.id, 'Assign to forwarder');
                            setDetailQuotation(null);
                          }}
                        >
                          <Check className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => {
                            onStatusChange(dq.id, 'Rejected');
                            setDetailQuotation(null);
                          }}
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </>
                    )}
                    {(dq.status === 'Pending' || dq.status === 'Sent for quotation') && dq.quotes.some(q => q.quotedAmount > 0) && (
                      <Button
                        variant="warning"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => {
                          onStatusChange(dq.id, 'Awaiting Approval');
                          setDetailQuotation(null);
                        }}
                      >
                        <Send className="h-3.5 w-3.5" /> Submit for Approval
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setDetailQuotation(null)}>Close</Button>
                    {!isAdmin && dq.status === 'Awaiting Approval' ? (
                      <Button variant="outline" size="sm" disabled className="gap-1.5">
                        <Lock className="h-3.5 w-3.5" /> Under Review
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setDetailQuotation(null); onEdit(dq); }}>
                        <Edit className="h-3.5 w-3.5" /> Edit
                      </Button>
                    )}
                    {isAdmin && (
                      <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => { setDetailQuotation(null); onDelete(dq.id); }}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
});

export default QuotationTable;
