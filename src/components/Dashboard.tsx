import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ENTITIES, CURRENCY_LIST, convertCurrency } from '../types';
import { ADMIN_EMAIL } from '../types';
import type { Quotation, Forwarder } from '../types';
import { useAuth } from '../auth';

const FORWARDER_GRADIENTS = [
  'linear-gradient(90deg, #f59e0b, #fbbf24)',
  'linear-gradient(90deg, #6366f1, #818cf8)',
  'linear-gradient(90deg, #06b6d4, #22d3ee)',
  'linear-gradient(90deg, #10b981, #34d399)',
  'linear-gradient(90deg, #ec4899, #f472b6)',
  'linear-gradient(90deg, #f97316, #fb923c)',
  'linear-gradient(90deg, #8b5cf6, #a78bfa)',
  'linear-gradient(90deg, #14b8a6, #5eead4)',
  'linear-gradient(90deg, #e11d48, #fb7185)',
  'linear-gradient(90deg, #0ea5e9, #38bdf8)',
];
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { formatCurrency } from '@/lib/utils';

interface DashboardProps {
  quotations: Quotation[];
  forwarders: Forwarder[];
}

const ENTITY_GRADIENT: Record<string, string> = {
  UAE: 'linear-gradient(135deg, var(--cyan-bg), var(--primary-bg))',
  Qatar: 'linear-gradient(135deg, var(--purple-bg), var(--pink-bg))',
  Oman: 'linear-gradient(135deg, var(--success-bg), rgba(52,211,153,0.05))',
  KSA: 'linear-gradient(135deg, var(--warning-bg), rgba(251,191,36,0.05))',
};

const STAT_TOP_GRADIENT: Record<string, string> = {
  purple: 'linear-gradient(90deg, var(--purple), var(--primary))',
  cyan: 'linear-gradient(90deg, var(--cyan), var(--info))',
  green: 'linear-gradient(90deg, var(--success), var(--success))',
  amber: 'linear-gradient(90deg, var(--warning), var(--warning))',
  pink: 'linear-gradient(90deg, var(--pink), var(--pink))',
};

const STAT_ICON_STYLE: Record<string, { bg: string; color: string }> = {
  purple: { bg: 'var(--purple-bg)', color: 'var(--purple)' },
  cyan: { bg: 'var(--cyan-bg)', color: 'var(--cyan)' },
  green: { bg: 'var(--success-bg)', color: 'var(--success)' },
  amber: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  pink: { bg: 'var(--pink-bg)', color: 'var(--pink)' },
};

const H3_ACCENT_BAR = { background: 'linear-gradient(180deg, var(--primary), var(--cyan))' };

const Dashboard = React.memo(function Dashboard({ quotations, forwarders }: DashboardProps) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [displayCurrency, setDisplayCurrency] = useState<string>('AED');
  const safeNum = (v: number) => (Number.isFinite(v) ? v : 0);

  const activeQuotations = useMemo(() =>
    quotations.filter(q => q.status !== 'Awaiting Approval' && q.status !== 'Rejected'),
    [quotations]
  );

  const pendingApprovalsCount = useMemo(() =>
    quotations.filter(q => q.status === 'Awaiting Approval').length,
    [quotations]
  );

  const totalPOValue = useMemo(() => safeNum(activeQuotations.reduce((sum, q) => {
    const valInDisplay = convertCurrency(q.poValue, q.poValueCurrency || 'AED', displayCurrency);
    return sum + valInDisplay;
  }, 0)), [activeQuotations, displayCurrency]);

  const totalQuotations = activeQuotations.length;

  const totalFreightSpending = useMemo(() => safeNum(activeQuotations.reduce((sum, q) => {
    if (!q.awardedTo) return sum;
    const awardedQuote = q.quotes.find(qu => qu.forwarder === q.awardedTo);
    if (!awardedQuote) return sum;
    const valInDisplay = convertCurrency(awardedQuote.quotedAmount, awardedQuote.currency || 'AED', displayCurrency);
    return sum + valInDisplay;
  }, 0)), [activeQuotations, displayCurrency]);

  const totalSavings = useMemo(() => safeNum(activeQuotations.reduce((sum, q) => {
    const savingsInDisplay = convertCurrency(q.savings || 0, q.poValueCurrency || 'AED', displayCurrency);
    return sum + savingsInDisplay;
  }, 0)), [activeQuotations, displayCurrency]);

  const freightVsPO = totalPOValue > 0
    ? ((totalFreightSpending / totalPOValue) * 100).toFixed(1)
    : '0.0';

  const forwarderStats = useMemo(() => {
    const forwarderNames = forwarders.map(f => f.name);
    return forwarderNames.map(f => {
      const awarded = activeQuotations.filter(q => q.awardedTo === f);
      const totalValue = awarded.reduce((sum, q) => {
        const quote = q.quotes.find(qu => qu.forwarder === f);
        if (!quote) return sum;
        const amtInDisplay = convertCurrency(quote.quotedAmount, quote.currency || 'AED', displayCurrency);
        return sum + amtInDisplay;
      }, 0);
      return { forwarder: f, count: awarded.length, totalValue };
    });
  }, [forwarders, activeQuotations, displayCurrency]);

  const maxForwarderValue = forwarderStats.length > 0
    ? Math.max(...forwarderStats.map(f => f.totalValue), 1)
    : 1;

  const entityStats = useMemo(() => ENTITIES.map(e => {
    const items = activeQuotations.filter(q => q.entity === e);
    const entityFreight = items.reduce((sum, q) => {
      if (!q.awardedTo) return sum;
      const awardedQuote = q.quotes.find(qu => qu.forwarder === q.awardedTo);
      if (!awardedQuote) return sum;
      const amtInDisplay = convertCurrency(awardedQuote.quotedAmount, awardedQuote.currency || 'AED', displayCurrency);
      return sum + amtInDisplay;
    }, 0);
    const entityPOValue = items.reduce((s, q) => {
      const poInDisplay = convertCurrency(q.poValue, q.poValueCurrency || 'AED', displayCurrency);
      return s + poInDisplay;
    }, 0);
    const entityFreightPct = entityPOValue > 0 ? ((entityFreight / entityPOValue) * 100).toFixed(1) : '0.0';
    return { entity: e, count: items.length, totalValue: entityPOValue, freight: entityFreight, freightPct: entityFreightPct };
  }), [activeQuotations, displayCurrency]);

  const statCards: Array<{ key: string; color: string; icon: string; label: string; value: string; sub: string }> = [
    { key: 'pos', color: 'purple', icon: '📄', label: 'Total POs', value: String(totalQuotations), sub: `${ENTITIES.length} entities` },
    { key: 'povalue', color: 'cyan', icon: '💵', label: 'Total PO Value', value: formatCurrency(totalPOValue), sub: displayCurrency },
    { key: 'freight', color: 'pink', icon: '🚛', label: 'Freight Spending', value: formatCurrency(totalFreightSpending), sub: displayCurrency },
    { key: 'pct', color: 'amber', icon: '📈', label: 'Freight vs PO', value: `${freightVsPO}%`, sub: 'of PO value' },
    { key: 'savings', color: 'green', icon: '💵', label: 'Total Savings', value: formatCurrency(totalSavings), sub: `${displayCurrency} saved` },
  ];

  return (
    <div className="flex flex-col gap-7">
      {/* Hero Banner */}
      <div
        className="relative overflow-hidden rounded-xl px-10 py-9 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all duration-300"
        style={{ background: 'var(--hero-bg)', color: 'var(--hero-text)' }}
      >
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, var(--primary), var(--cyan), transparent)' }}
        />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-1">Dashboard</h2>
          <p style={{ color: 'var(--hero-text-secondary)' }} className="text-sm">Overview of your quotation activity</p>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
            <SelectTrigger className="w-[130px] h-9 text-xs bg-card/80 backdrop-blur">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_LIST.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && pendingApprovalsCount > 0 && (
            <Link to="/quotations">
              <Badge variant="warning" className="text-xs cursor-pointer">
                {pendingApprovalsCount} pending approval{pendingApprovalsCount !== 1 ? 's' : ''}
              </Badge>
            </Link>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.key} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: STAT_TOP_GRADIENT[stat.color] }} />
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: STAT_ICON_STYLE[stat.color]?.bg, color: STAT_ICON_STYLE[stat.color]?.color }}
                >
                  {stat.icon}
                </div>
              </div>
              <div className="text-2xl font-bold mb-0.5">{stat.value}</div>
              <div className="text-xs text-muted-foreground font-medium">{stat.label}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{stat.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forwarder Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-1 h-5 rounded" style={H3_ACCENT_BAR} />
              Forwarder Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {forwarderStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No data yet</p>
            ) : (
              <div className="flex flex-col gap-3">
                {forwarderStats.map((f, idx) => (
                  <div key={f.forwarder}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium">{f.forwarder}</span>
                      <span className="text-muted-foreground">{f.count} award{f.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                        style={{ width: `${(f.totalValue / maxForwarderValue) * 100}%`, background: FORWARDER_GRADIENTS[idx % FORWARDER_GRADIENTS.length] }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{formatCurrency(f.totalValue)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Entity Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-1 h-5 rounded" style={H3_ACCENT_BAR} />
              Entity Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {entityStats.map((es) => (
                <div key={es.entity} className="rounded-xl p-4 border border-border/50 transition-all duration-300 hover:shadow-sm" style={{ background: ENTITY_GRADIENT[es.entity] }}>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="text-[11px] uppercase font-bold">{es.entity}</Badge>
                    <span className="text-xs text-muted-foreground">{es.count} quotation{es.count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">PO Value</div>
                      <div className="text-sm font-bold">{formatCurrency(es.totalValue)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Freight</div>
                      <div className="text-sm font-bold">{formatCurrency(es.freight)}</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Freight %</span>
                      <span className="font-semibold">{es.freightPct}%</span>
                    </div>
                    <Progress value={parseFloat(es.freightPct)} className="h-1.5" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default Dashboard;
