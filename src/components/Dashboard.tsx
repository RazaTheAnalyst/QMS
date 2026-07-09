import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ENTITIES, convertCurrency } from '../types';
import { ADMIN_EMAIL } from '../types';
import type { Quotation, Forwarder } from '../types';
import { useAuth } from '../auth';
import { formatCurrency } from '@/lib/utils';
import {
  Box, Card, CardContent, Typography, Grid, LinearProgress, Chip,
} from '@mui/material';
import {
  DescriptionOutlined, AttachMoneyOutlined, LocalShippingOutlined,
  TrendingUpOutlined, AccountBalanceWalletOutlined,
} from '@mui/icons-material';

interface DashboardProps {
  quotations: Quotation[];
  forwarders: Forwarder[];
  displayCurrency: string;
}

const ENTITY_COLORS: Record<string, { main: string; gradient: string }> = {
  UAE: { main: '#7c3aed', gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)' },
  Qatar: { main: '#2563eb', gradient: 'linear-gradient(135deg, #2563eb, #60a5fa)' },
  Oman: { main: '#059669', gradient: 'linear-gradient(135deg, #059669, #34d399)' },
};

function entityColor(entity: string): { main: string; gradient: string } {
  return (ENTITY_COLORS[entity] || ENTITY_COLORS['UAE'])!;
}

const STAT_CARD_STYLES: Record<string, { gradient: string; accent: string; icon: React.ReactNode }> = {
  pos: {
    gradient: 'linear-gradient(135deg, #f1f5ff 0%, #eef2ff 100%)',
    accent: '#4f46e5',
    icon: <DescriptionOutlined />,
  },
  povalue: {
    gradient: 'linear-gradient(135deg, #eef9ff 0%, #e0f7fa 100%)',
    accent: '#0284c7',
    icon: <AttachMoneyOutlined />,
  },
  freight: {
    gradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
    accent: '#d97706',
    icon: <LocalShippingOutlined />,
  },
  pct: {
    gradient: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
    accent: '#9333ea',
    icon: <TrendingUpOutlined />,
  },
  savings: {
    gradient: 'linear-gradient(135deg, #ecfdf5 0%, #dff8ea 100%)',
    accent: '#059669',
    icon: <AccountBalanceWalletOutlined />,
  },
};

const FORWARDER_COLORS = [
  '#6366f1', '#0ea5e9', '#f59e0b', '#10b981', '#d946ef', '#f43f5e',
  '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4', '#84cc16', '#ec4899',
];

export default function Dashboard({ quotations, forwarders, displayCurrency }: DashboardProps) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
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

  const statCards = [
    { key: 'pos', label: 'Total POs', value: String(totalQuotations), sub: `${ENTITIES.length} entities` },
    { key: 'povalue', label: 'Total PO Value', value: formatCurrency(totalPOValue), sub: displayCurrency },
    { key: 'freight', label: 'Freight Spending', value: formatCurrency(totalFreightSpending), sub: displayCurrency },
    { key: 'pct', label: 'Freight vs PO', value: `${freightVsPO}%`, sub: 'of PO value' },
    { key: 'savings', label: 'Total Savings', value: formatCurrency(totalSavings), sub: `${displayCurrency} saved` },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1.5 }}>
        {isAdmin && pendingApprovalsCount > 0 && (
          <Chip
            component={Link}
            to="/quotations"
            label={`${pendingApprovalsCount} pending approval${pendingApprovalsCount !== 1 ? 's' : ''}`}
            color="warning"
            size="small"
            clickable
            sx={{ fontWeight: 600, cursor: 'pointer' }}
          />
        )}
      </Box>

      <Grid container spacing={1.5}>
        {statCards.map((stat) => {
          const style = STAT_CARD_STYLES[stat.key]!;
          return (
            <Grid item xs={6} sm={4} lg={2.4} key={stat.key}>
              <Card sx={{
                background: style.gradient,
                color: 'text.primary',
                border: '1px solid',
                borderColor: 'rgba(23,32,31,0.08)',
                boxShadow: '0 12px 28px -24px rgba(23,32,31,0.55)',
                '& .MuiCardContent-root:last-child': { pb: 2 },
                transition: 'transform 0.2s, box-shadow 0.3s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 16px 36px -26px rgba(23,32,31,0.75)',
                },
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                        {stat.label}
                      </Typography>
                      <Typography variant="h5" sx={{ color: style.accent, mt: 0.5, fontWeight: 850 }}>
                        {stat.value}
                      </Typography>
                    </Box>
                    <Box sx={{
                      width: 40, height: 40, borderRadius: 1.5,
                      bgcolor: `${style.accent}18`,
                      border: '1px solid',
                      borderColor: `${style.accent}24`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: style.accent,
                    }}>
                      {style.icon}
                    </Box>
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block', fontWeight: 600 }}>
                    {stat.sub}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ height: 1, bgcolor: 'divider', mx: 0 }} />

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={6}>
          <Card sx={{ borderTop: '3px solid', borderTopColor: '#6366f1' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: 1,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                }}>
                  <LocalShippingOutlined sx={{ fontSize: 16 }} />
                </Box>
                <Typography variant="h6" sx={{ fontSize: '1rem' }}>Forwarder Performance</Typography>
              </Box>
              {forwarderStats.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>No data yet</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {forwarderStats.map((f, i) => {
                    const color = FORWARDER_COLORS[i % FORWARDER_COLORS.length];
                    return (
                      <Box key={f.forwarder} sx={{
                        borderRadius: 1.5, border: '1px solid', borderColor: 'divider',
                        bgcolor: 'action.hover', p: 1.5, transition: 'all 0.2s',
                        '&:hover': { borderColor: color, boxShadow: `0 0 0 1px ${color}40` },
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{
                              width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0,
                            }} />
                            <Typography variant="body2" fontWeight={600} noWrap>{f.forwarder}</Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: color, fontWeight: 700 }}>
                            {f.count} award{f.count !== 1 ? 's' : ''}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min((f.totalValue / maxForwarderValue) * 100, 100)}
                          sx={{
                            backgroundColor: `${color}20`,
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: color,
                              backgroundImage: `linear-gradient(90deg, ${color}, ${color}cc)`,
                              borderRadius: 4,
                            },
                          }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatCurrency(f.totalValue)} {displayCurrency}
                          </Typography>
                          <Typography variant="caption" fontWeight={700} color={color}>
                            {maxForwarderValue > 0 ? Math.round((f.totalValue / maxForwarderValue) * 100) : 0}%
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card sx={{ borderTop: '3px solid', borderTopColor: '#7c3aed' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: 1,
                  background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                }}>
                  <DescriptionOutlined sx={{ fontSize: 16 }} />
                </Box>
                <Typography variant="h6" sx={{ fontSize: '1rem' }}>Entity Breakdown</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {entityStats.map(es => {
                  const ec = entityColor(es.entity);
                  return (
                    <Card key={es.entity} variant="outlined" sx={{
                      borderRadius: 1.5, overflow: 'hidden',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' },
                    }}>
                      <Box sx={{ height: 6, background: ec.gradient }} />
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{
                              width: 10, height: 10, borderRadius: '50%', bgcolor: ec.main, flexShrink: 0,
                            }} />
                            <Typography variant="subtitle2" fontWeight={700}>{es.entity}</Typography>
                          </Box>
                          <Chip label={`${es.count} quotation${es.count !== 1 ? 's' : ''}`} size="small"
                            sx={{ fontWeight: 600, fontSize: '0.6875rem', bgcolor: `${ec.main}15`, color: ec.main }} />
                        </Box>
                        <Grid container spacing={1.5}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>PO Value</Typography>
                            <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                              {formatCurrency(es.totalValue)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>Freight</Typography>
                            <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                              {formatCurrency(es.freight)}
                            </Typography>
                          </Grid>
                        </Grid>
                        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">Freight %</Typography>
                            <Typography variant="caption" fontWeight={700} sx={{ color: ec.main }}>{es.freightPct}%</Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(parseFloat(es.freightPct), 100)}
                            sx={{
                              backgroundColor: `${ec.main}20`,
                              '& .MuiLinearProgress-bar': {
                                background: ec.gradient,
                                borderRadius: 4,
                              },
                            }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
