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

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={6}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: '0 18px 36px -32px rgba(23,32,31,0.55)' }}>
            <CardContent sx={{ p: 2.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{
                    width: 30, height: 30, borderRadius: 1,
                    bgcolor: 'rgba(99,102,241,0.10)',
                    border: '1px solid rgba(99,102,241,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5',
                  }}>
                    <LocalShippingOutlined sx={{ fontSize: 16 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontSize: '0.98rem' }}>Forwarder Performance</Typography>
                    <Typography variant="caption" color="text.secondary">Awarded freight value by forwarder</Typography>
                  </Box>
                </Box>
              </Box>
              {forwarderStats.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>No data yet</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {forwarderStats.map((f, i) => {
                    const color = FORWARDER_COLORS[i % FORWARDER_COLORS.length];
                    const pct = maxForwarderValue > 0 ? Math.round((f.totalValue / maxForwarderValue) * 100) : 0;
                    return (
                      <Box key={f.forwarder} sx={{
                        py: 1.25,
                        borderTop: i === 0 ? 0 : '1px solid',
                        borderColor: 'divider',
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 150px' },
                        gap: { xs: 0.75, sm: 2 },
                        alignItems: 'center',
                      }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.85 }}>
                            <Box sx={{
                              width: 22, height: 22, borderRadius: 0.75,
                              bgcolor: `${color}14`,
                              color,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.72rem', fontWeight: 850,
                              flexShrink: 0,
                            }}>
                              {i + 1}
                            </Box>
                            <Typography variant="body2" fontWeight={750} noWrap>{f.forwarder}</Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(pct, 100)}
                            sx={{
                              height: 5,
                              borderRadius: 4,
                              backgroundColor: `${color}14`,
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: color,
                                borderRadius: 4,
                              },
                            }}
                          />
                        </Box>
                        <Box sx={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto',
                          gap: 1,
                          alignItems: 'center',
                          justifySelf: { sm: 'stretch' },
                        }}>
                          <Box>
                            <Typography variant="body2" fontWeight={800} sx={{ fontFamily: 'monospace', lineHeight: 1.2 }}>
                              {formatCurrency(f.totalValue)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">{displayCurrency}</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2" fontWeight={800} sx={{ color, lineHeight: 1.2 }}>{pct}%</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {f.count} award{f.count !== 1 ? 's' : ''}
                            </Typography>
                          </Box>
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
          <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: '0 18px 36px -32px rgba(23,32,31,0.55)' }}>
            <CardContent sx={{ p: 2.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 2 }}>
                <Box sx={{
                  width: 30, height: 30, borderRadius: 1,
                  bgcolor: 'rgba(124,58,237,0.10)',
                  border: '1px solid rgba(124,58,237,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed',
                }}>
                  <DescriptionOutlined sx={{ fontSize: 16 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h6" sx={{ fontSize: '0.98rem' }}>Entity Breakdown</Typography>
                  <Typography variant="caption" color="text.secondary">PO value, freight value, and freight ratio</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {entityStats.map(es => {
                  const ec = entityColor(es.entity);
                  return (
                    <Box key={es.entity} sx={{
                      py: 1.4,
                      borderTop: es.entity === entityStats[0]?.entity ? 0 : '1px solid',
                      borderColor: 'divider',
                    }}>
                      <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '140px 1fr' },
                        gap: { xs: 1, sm: 2 },
                        alignItems: 'center',
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                          <Box sx={{
                            width: 9, height: 34, borderRadius: 1,
                            background: ec.gradient,
                            flexShrink: 0,
                          }} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" fontWeight={850} sx={{ letterSpacing: '0.03em' }}>{es.entity}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {es.count} quotation{es.count !== 1 ? 's' : ''}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 72px' },
                            gap: 1.5,
                            alignItems: 'end',
                            mb: 0.85,
                          }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight={750}>PO Value</Typography>
                              <Typography variant="body2" fontWeight={800} sx={{ fontFamily: 'monospace' }}>
                                {formatCurrency(es.totalValue)}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight={750}>Freight</Typography>
                              <Typography variant="body2" fontWeight={800} sx={{ fontFamily: 'monospace' }}>
                                {formatCurrency(es.freight)}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                              <Typography variant="caption" color="text.secondary" fontWeight={750}>Freight</Typography>
                              <Typography variant="body2" fontWeight={850} sx={{ color: ec.main }}>
                                {es.freightPct}%
                              </Typography>
                            </Box>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(parseFloat(es.freightPct), 100)}
                            sx={{
                              height: 5,
                              borderRadius: 4,
                              backgroundColor: `${ec.main}14`,
                              '& .MuiLinearProgress-bar': {
                                background: ec.gradient,
                                borderRadius: 4,
                              },
                            }}
                          />
                        </Box>
                      </Box>
                    </Box>
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
