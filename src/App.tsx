import { useState, useMemo, useCallback, useEffect, useRef, lazy, Suspense, Component, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Search } from '@mui/icons-material';
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, AlertTitle,
} from '@mui/material';
import { useSnackbar } from './snackbar';
import { useStore } from './store';
import { useAuth, AuthProvider } from './auth';
import { ThemeProvider } from './theme';
import type { Quotation, QuotationInput, Filters, Forwarder } from './types';
import { ADMIN_EMAIL, convertCurrency } from './types';
import { AppNav } from './components/AppNav';
import { MobileNav } from './components/MobileNav';

const Dashboard = lazy(() => import('./components/Dashboard'));
const QuotationTable = lazy(() => import('./components/QuotationTable'));
const QuotationForm = lazy(() => import('./components/QuotationForm'));
const SearchFilter = lazy(() => import('./components/SearchFilter'));
const Forwarders = lazy(() => import('./components/Forwarders'));
const LoginPage = lazy(() => import('./components/LoginPage'));

const APPROVED_STATUSES = new Set([
  'Assign to forwarder',
  'In Transit',
  'Arrived Awaiting Clearance',
  'Under Clearance',
  'Delivered',
]);

function titleCaseName(value: string) {
  return value
    .replace(/[._-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
}

function getActorName(user: { email?: string; user_metadata?: Record<string, unknown> } | null | undefined) {
  const metadata = user?.user_metadata ?? {};
  const metadataName = metadata.full_name || metadata.name || metadata.display_name;
  if (typeof metadataName === 'string' && metadataName.trim()) {
    return metadataName.trim();
  }

  const emailName = user?.email?.split('@')[0] ?? '';
  return emailName ? titleCaseName(emailName) : 'Unknown user';
}

function PageLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <Box sx={{ width: 32, height: 32, border: '3px solid', borderColor: 'divider', borderTopColor: 'primary.main', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </Box>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  state = { hasError: false, error: '' };
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, error: err.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
          <Box sx={{ maxWidth: 440, width: '100%', p: 4, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Something went wrong</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ my: 1.5 }}>{this.state.error}</Typography>
            <Button variant="contained" onClick={() => window.location.reload()}>Reload</Button>
          </Box>
        </Box>
      );
    }
    return this.props.children;
  }
}

interface QuotationsPageProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  filteredQuotations: Quotation[];
  quotations: Quotation[];
  forwarders: Forwarder[];
  onEdit: (quotation: Quotation) => void;
  onDelete: (id: number) => void;
  onAward: (id: number, forwarder: string) => void;
  onStatusChange: (id: number, status: string) => void;
}

const QuotationsPage = (function QuotationsPage({
  filters, onFilterChange, filteredQuotations, quotations, forwarders,
  onEdit, onDelete, onAward, onStatusChange,
}: QuotationsPageProps) {
  return (
    <>
      <SearchFilter filters={filters} onFilterChange={onFilterChange} resultCount={filteredQuotations.length} totalCount={quotations.length} />
      <QuotationTable
        quotations={filteredQuotations}
        forwarders={forwarders}
        onEdit={onEdit}
        onDelete={onDelete}
        onAward={onAward}
        onStatusChange={onStatusChange}
        searchActive={Boolean(filters.search.trim())}
      />
    </>
  );
});

function ConfirmDialog({ open, onConfirm, onCancel, title, description }: {
  open: boolean; onConfirm: () => void; onCancel: () => void; title: string; description: string;
}) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs">
      <DialogTitle fontWeight={700}>{title}</DialogTitle>
      <DialogContent><Typography variant="body2" color="text.secondary">{description}</Typography></DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm} color="error" variant="contained">Confirm</Button>
      </DialogActions>
    </Dialog>
  );
}

function RejectionPrompt({ open, onSubmit, onCancel }: {
  open: boolean; onSubmit: (reason: string) => void; onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight={700}>Rejection Reason</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>Please enter the reason for rejection:</Typography>
        <TextField
          multiline rows={3} placeholder="Enter reason..." fullWidth size="small" autoFocus
          value={reason} onChange={e => setReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSubmit(reason)} color="error" variant="contained">Reject</Button>
      </DialogActions>
    </Dialog>
  );
}

function AppContent() {
  const { session, user, loading: authLoading } = useAuth();
  const snackbar = useSnackbar();
  const { quotations, forwarders, addQuotation, updateQuotation, deleteQuotation, addForwarder, deleteForwarder, updateForwarder, loading, error: storeError } = useStore();
  const approvalBackfillDoneRef = useRef(false);
  const [showForm, setShowForm] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [filters, setFilters] = useState<Filters>({ search: '', entity: '', status: '' });
  const [displayCurrency, setDisplayCurrency] = useState('AED');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [confirmDeleteFwd, setConfirmDeleteFwd] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);

  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      const searchLower = filters.search.toLowerCase();
      const searchMatch = !filters.search ||
        q.supplierName.toLowerCase().includes(searchLower) ||
        q.supplierPO.toLowerCase().includes(searchLower) ||
        q.remarks.toLowerCase().includes(searchLower) ||
        q.origin.toLowerCase().includes(searchLower) ||
        q.destination.toLowerCase().includes(searchLower) ||
        q.awardedTo.toLowerCase().includes(searchLower) ||
        q.entity.toLowerCase().includes(searchLower) ||
        q.mode.toLowerCase().includes(searchLower) ||
        q.size.toLowerCase().includes(searchLower) ||
        q.incoterms.toLowerCase().includes(searchLower) ||
        q.transitTime.toLowerCase().includes(searchLower) ||
        q.status.toLowerCase().includes(searchLower) ||
        q.quotes.some(qu => qu.forwarder.toLowerCase().includes(searchLower));
      const entityMatch = !filters.entity || q.entity === filters.entity;
      const statusMatch = !filters.status || q.status === filters.status;
      return searchMatch && entityMatch && statusMatch;
    });
  }, [quotations, filters]);

  const pendingApprovalsCount = useMemo(() =>
    quotations.filter(q => q.status === 'Awaiting Approval').length,
    [quotations]
  );

  useEffect(() => {
    if (!session || loading || approvalBackfillDoneRef.current || user?.email !== ADMIN_EMAIL) return;

    const targets = quotations.filter(q =>
      APPROVED_STATUSES.has(q.status) &&
      (!q.approvedBy || !q.approvedAt)
    );

    if (targets.length === 0) {
      approvalBackfillDoneRef.current = true;
      return;
    }

    approvalBackfillDoneRef.current = true;
    const actorName = getActorName(user);
    const approvedAt = new Date().toISOString();

    void Promise.all(targets.map(q =>
      updateQuotation(q.id, {
        approvedBy: q.approvedBy || actorName,
        approvedAt: q.approvedAt || approvedAt,
      })
    ))
      .then(() => {
        snackbar.success(`Approval history updated for ${targets.length} quotation${targets.length === 1 ? '' : 's'}.`);
      })
      .catch((err) => {
        console.error('Approval backfill failed:', err);
        snackbar.error('Failed to update approval history.');
      });
  }, [loading, quotations, session, snackbar, updateQuotation, user]);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditingQuotation(null);
  }, []);

  const handleSave = useCallback(async (data: QuotationInput & { percentage: number; savings: number }) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { percentage: _pct, ...input } = data;
      if (editingQuotation) {
        await updateQuotation(editingQuotation.id, input);
        snackbar.success('Quotation updated successfully!');
      } else {
        await addQuotation({
          ...input,
          createdBy: getActorName(user),
          createdAt: new Date().toISOString(),
        });
        snackbar.success('Quotation created successfully!');
      }
      setShowForm(false);
      setEditingQuotation(null);
    } catch (err) {
      console.error('Save failed:', err);
      snackbar.error('Failed to save quotation');
    }
  }, [editingQuotation, updateQuotation, addQuotation, snackbar, user]);

  const handleEdit = useCallback((quotation: Quotation) => {
    setEditingQuotation(quotation);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    if (user?.email !== ADMIN_EMAIL) {
      snackbar.error('Only the admin can delete quotations.');
      return;
    }
    setConfirmDelete(id);
  }, [user, snackbar]);

  const handleConfirmDelete = useCallback(async () => {
    if (confirmDelete === null) return;
    try {
      await deleteQuotation(confirmDelete);
      snackbar.success('Quotation deleted successfully!');
    } catch (err) {
      console.error('Delete failed:', err);
      snackbar.error('Failed to delete quotation');
    }
    setConfirmDelete(null);
  }, [confirmDelete, deleteQuotation, snackbar]);

  const handleDeleteForwarder = useCallback(async (id: number) => {
    if (user?.email !== ADMIN_EMAIL) {
      snackbar.error('Only the admin can delete forwarders.');
      return;
    }
    setConfirmDeleteFwd(id);
  }, [user, snackbar]);

  const handleConfirmDeleteFwd = useCallback(async () => {
    if (confirmDeleteFwd === null) return;
    try {
      await deleteForwarder(confirmDeleteFwd);
      snackbar.success('Forwarder deleted successfully!');
    } catch (err) {
      console.error('Delete forwarder failed:', err);
      snackbar.error('Failed to delete forwarder');
    }
    setConfirmDeleteFwd(null);
  }, [confirmDeleteFwd, deleteForwarder, snackbar]);

  const handleAddForwarder = useCallback(async (data: Omit<Forwarder, 'id'>) => {
    const duplicate = forwarders.some(f => f.name.toLowerCase() === data.name.trim().toLowerCase());
    if (duplicate) {
      snackbar.warning(`A forwarder named "${data.name.trim()}" already exists.`);
      throw new Error('Duplicate forwarder');
    }
    try {
      await addForwarder(data);
      snackbar.success(`Forwarder "${data.name}" added successfully!`);
    } catch (err) {
      console.error('Failed to add forwarder:', err);
      snackbar.error('Failed to add forwarder');
      throw err;
    }
  }, [forwarders, addForwarder, snackbar]);

  const handleEditForwarder = useCallback(async (id: number, data: Omit<Forwarder, 'id'>) => {
    const duplicate = forwarders.some(f => f.id !== id && f.name.toLowerCase() === data.name.trim().toLowerCase());
    if (duplicate) {
      snackbar.warning(`A forwarder named "${data.name.trim()}" already exists.`);
      throw new Error('Duplicate forwarder');
    }
    try {
      await updateForwarder(id, data);
      snackbar.success(`Forwarder "${data.name}" updated successfully!`);
    } catch (err) {
      console.error('Failed to update forwarder:', err);
      snackbar.error('Failed to update forwarder');
      throw err;
    }
  }, [forwarders, updateForwarder, snackbar]);

  const handleAward = useCallback(async (id: number, forwarder: string) => {
    try {
      const q = quotations.find(item => item.id === id);
      let savingsUpdate = {};
      if (q && q.quotes.length >= 2) {
        const poCurrency = q.poValueCurrency || 'AED';
        const amounts = q.quotes.filter(qu => qu.quotedAmount > 0).map(qu => ({
          forwarder: qu.forwarder,
          amount: convertCurrency(qu.quotedAmount, qu.currency || 'AED', poCurrency),
        }));
        if (amounts.length >= 2) {
          const lowestAmt = Math.min(...amounts.map(a => a.amount));
          const awardedAmt = amounts.find(a => a.forwarder === forwarder)?.amount ?? lowestAmt;
          savingsUpdate = { savings: Math.round((lowestAmt - awardedAmt) * 100) / 100 };
        }
      }
      await updateQuotation(id, { awardedTo: forwarder, ...savingsUpdate });
      snackbar.success(`Quotation awarded to ${forwarder}!`);
    } catch (err) {
      console.error('Award failed:', err);
      snackbar.error('Failed to award forwarder');
    }
  }, [updateQuotation, quotations, snackbar]);

  const handleStatusChange = useCallback(async (id: number, status: string) => {
    try {
      if (status === 'Assign to forwarder') {
        const q = quotations.find(item => item.id === id);
        if (q && !q.awardedTo) {
          snackbar.warning('Please select a forwarder quote to award before approving.');
          return;
        }
      }
      if (status === 'Rejected') {
        setRejectTarget(id);
        return;
      }
      const approvalStamp = status === 'Assign to forwarder'
        ? { approvedBy: getActorName(user), approvedAt: new Date().toISOString() }
        : {};
      await updateQuotation(id, { status, ...approvalStamp });
      snackbar.success(`Quotation status updated to ${status}!`);
    } catch (err) {
      console.error('Status update failed:', err);
      snackbar.error('Failed to update status');
    }
  }, [quotations, updateQuotation, snackbar, user]);

  const handleRejectSubmit = useCallback(async (reason: string) => {
    if (rejectTarget === null) return;
    try {
      await updateQuotation(rejectTarget, { status: 'Rejected', remarks: `Rejected: ${reason.trim() || 'No reason provided.'}` });
      snackbar.success('Quotation rejected!');
    } catch (err) {
      console.error('Status update failed:', err);
      snackbar.error('Failed to update status');
    }
    setRejectTarget(null);
  }, [rejectTarget, updateQuotation, snackbar]);

  const handleAdd = useCallback(() => {
    setEditingQuotation(null);
    setShowForm(true);
  }, []);

  if (authLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 32, height: 32, border: '3px solid', borderColor: 'divider', borderTopColor: 'primary.main', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <Typography variant="body2" color="text.secondary">Loading...</Typography>
        </Box>
      </Box>
    );
  }

  if (!session) {
    return (
      <Suspense fallback={<PageLoader />}>
        <LoginPage />
      </Suspense>
    );
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 32, height: 32, border: '3px solid', borderColor: 'divider', borderTopColor: 'primary.main', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <Typography variant="body2" color="text.secondary">Loading quotations...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <>
      <AppNav
        onAdd={handleAdd}
        displayCurrency={displayCurrency}
        onCurrencyChange={setDisplayCurrency}
      />

      {storeError && (
        <Alert severity="error" sx={{ borderRadius: 0, borderWidth: 0 }}>
          <AlertTitle>Error</AlertTitle>
          Error loading data: {storeError}
        </Alert>
      )}

      <Box component="main" sx={{
        flex: 1,
        py: { xs: 2, sm: 3 },
        px: { xs: 1.5, sm: 2.5, xl: 3 },
        maxWidth: 1680,
        width: '100%',
        mx: 'auto',
        pb: { xs: 10, md: 4 },
      }}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<ErrorBoundary key="dashboard"><Dashboard quotations={quotations} forwarders={forwarders} displayCurrency={displayCurrency} /></ErrorBoundary>} />
            <Route
              path="/quotations"
              element={
                <ErrorBoundary key="quotations">
                  <QuotationsPage
                    filters={filters}
                    onFilterChange={setFilters}
                    filteredQuotations={filteredQuotations}
                    quotations={quotations}
                    forwarders={forwarders}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onAward={handleAward}
                    onStatusChange={handleStatusChange}
                  />
                </ErrorBoundary>
              }
            />
            <Route
              path="/forwarders"
              element={
                <ErrorBoundary key="forwarders">
                  <Forwarders
                    forwarders={forwarders}
                    onAdd={handleAddForwarder}
                    onEdit={handleEditForwarder}
                    onDelete={handleDeleteForwarder}
                  />
                </ErrorBoundary>
              }
            />
            <Route path="*" element={
              <Box sx={{ textAlign: 'center', py: 7.5, px: 2.5, color: 'text.secondary' }}>
                <Search sx={{ fontSize: 48, mb: 2, color: 'text.disabled' }} />
                <Typography variant="body1" fontWeight={500}>Page not found</Typography>
              </Box>
            } />
          </Routes>
        </Suspense>
      </Box>

      <MobileNav pendingApprovalsCount={pendingApprovalsCount} onAdd={handleAdd} />

      {showForm && (
        <Suspense fallback={<PageLoader />}>
          <QuotationForm
            quotation={editingQuotation}
            forwarders={forwarders}
            onSave={handleSave}
            onClose={handleCloseForm}
          />
        </Suspense>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
        title="Delete Quotation"
        description="Are you sure you want to delete this quotation? This action cannot be undone."
      />

      <ConfirmDialog
        open={confirmDeleteFwd !== null}
        onConfirm={handleConfirmDeleteFwd}
        onCancel={() => setConfirmDeleteFwd(null)}
        title="Delete Forwarder"
        description="Are you sure you want to delete this forwarder? This action cannot be undone."
      />

      <RejectionPrompt
        open={rejectTarget !== null}
        onSubmit={handleRejectSubmit}
        onCancel={() => setRejectTarget(null)}
      />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
