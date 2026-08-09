import { useState, useMemo, useCallback, lazy, Suspense, Component, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import LockOutlined from '@mui/icons-material/LockOutlined';
import Search from '@mui/icons-material/Search';
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, AlertTitle,
} from '@mui/material';
import { useSnackbar } from './snackbar';
import { useStore } from './store';
import { useAuth, AuthProvider } from './auth';
import { ThemeProvider } from './theme';
import type { Quotation, QuotationInput, Filters, Forwarder, AppModule, AppUserInput } from './types';
import { ADMIN_EMAIL, calculateAwardSavings } from './types';
import { useDebouncedValue, getUserName } from '@/lib/utils';
import { AppNav } from './components/AppNav';
import { MobileNav } from './components/MobileNav';

const Dashboard = lazy(() => import('./components/Dashboard'));
const QuotationTable = lazy(() => import('./components/QuotationTable'));
const QuotationForm = lazy(() => import('./components/QuotationForm'));
const SearchFilter = lazy(() => import('./components/SearchFilter'));
const Forwarders = lazy(() => import('./components/Forwarders'));
const LoginPage = lazy(() => import('./components/LoginPage'));
const Users = lazy(() => import('./components/Users'));
const ResetPassword = lazy(() => import('./components/ResetPassword'));

const ALL_MODULES: AppModule[] = ['dashboard', 'quotations', 'forwarders', 'users'];

function PageLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <Box sx={{ width: 32, height: 32, border: '3px solid', borderColor: 'divider', borderTopColor: 'primary.main', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </Box>
  );
}

function AccessDenied() {
  return (
    <Box sx={{ textAlign: 'center', py: 8, px: 2.5, color: 'text.secondary' }}>
      <LockOutlined sx={{ fontSize: 46, mb: 2, color: 'text.disabled' }} />
      <Typography variant="h6" fontWeight={800} color="text.primary">Access restricted</Typography>
      <Typography variant="body2" sx={{ mt: 0.75 }}>
        Your account does not have access to this module.
      </Typography>
    </Box>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
          <Box sx={{ maxWidth: 440, width: '100%', p: 4, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Something went wrong</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ my: 1.5 }}>An unexpected error occurred. Please reload the page.</Typography>
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
  onExcludeToggle: (id: number, excluded: boolean) => void;
  onClone: (quotation: Quotation) => void;
  displayCurrency: string;
}

const QuotationsPage = (function QuotationsPage({
  filters, onFilterChange, filteredQuotations, quotations, forwarders,
  onEdit, onDelete, onAward, onStatusChange, onExcludeToggle, onClone, displayCurrency,
}: QuotationsPageProps) {
  return (
    <>
      <SearchFilter filters={filters} onFilterChange={onFilterChange} resultCount={filteredQuotations.length} totalCount={quotations.length} forwarders={forwarders} />
      <QuotationTable
        quotations={filteredQuotations}
        forwarders={forwarders}
        onEdit={onEdit}
        onDelete={onDelete}
        onAward={onAward}
        onStatusChange={onStatusChange}
        onExcludeToggle={onExcludeToggle}
        onClone={onClone}
        searchActive={Boolean(filters.search.trim())}
        displayCurrency={displayCurrency}
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
  const {
    quotations,
    forwarders,
    appUsers,
    addQuotation,
    updateQuotation,
    deleteQuotation,
    addForwarder,
    deleteForwarder,
    updateForwarder,
    addAppUser,
    updateAppUser,
    deleteAppUser,
    loading,
    error: storeError,
  } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [filters, setFilters] = useState<Filters>({ search: '', entity: '', status: '', mode: '', forwarder: '', dateFrom: '', dateTo: '' });
  const [displayCurrency, setDisplayCurrency] = useState('AED');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [confirmDeleteFwd, setConfirmDeleteFwd] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);

  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      const searchLower = debouncedSearch.toLowerCase();
      const searchMatch = !debouncedSearch ||
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
      const modeMatch = !filters.mode || q.mode === filters.mode;
      const forwarderMatch = !filters.forwarder || q.awardedTo === filters.forwarder;
      const dateMatch = (() => {
        if (!filters.dateFrom && !filters.dateTo) return true;
        if (!q.createdAt) return false;
        const ts = new Date(q.createdAt).getTime();
        if (Number.isNaN(ts)) return false;
        const from = filters.dateFrom ? new Date(filters.dateFrom + 'T00:00:00').getTime() : -Infinity;
        const to = filters.dateTo ? new Date(filters.dateTo + 'T23:59:59.999').getTime() : Infinity;
        return ts >= from && ts <= to;
      })();
      return searchMatch && entityMatch && statusMatch && modeMatch && forwarderMatch && dateMatch;
    });
  }, [quotations, filters, debouncedSearch]);

  const pendingApprovalsCount = useMemo(() =>
    quotations.filter(q => q.status === 'Awaiting Approval').length,
    [quotations]
  );

  const currentAccess = useMemo(() => {
    if (user?.email === ADMIN_EMAIL) {
      return { role: 'Admin', modules: ALL_MODULES, active: true };
    }

    const profile = appUsers.find(item =>
      item.email.toLowerCase() === (user?.email ?? '').toLowerCase()
    );

    if (!profile) return { role: 'Sales', modules: [] as AppModule[], active: false };

    return {
      role: profile.role,
      modules: profile.active ? profile.modules : [],
      active: profile.active,
    };
  }, [appUsers, user]);

  const canAccess = useCallback((module: AppModule) =>
    currentAccess.active && currentAccess.modules.includes(module),
    [currentAccess]
  );

  const canManageUsers = canAccess('users') && currentAccess.role === 'Admin';

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditingQuotation(null);
  }, []);

  const handleSave = useCallback(async (data: QuotationInput & { percentage: number; savings: number }) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { percentage: _pct, ...input } = data;
      if (editingQuotation && editingQuotation.id > 0) {
        await updateQuotation(editingQuotation.id, input);
        snackbar.success('Quotation updated successfully!');
      } else {
        const duplicate = quotations.some(q =>
          q.supplierPO.trim().toLowerCase() === input.supplierPO.trim().toLowerCase() &&
          q.entity === input.entity
        );
        if (duplicate) {
          snackbar.warning(`A quotation already exists for PO "${input.supplierPO}" (${input.entity}).`);
          return;
        }
        await addQuotation({
          ...input,
          createdBy: getUserName(user),
          createdAt: new Date().toISOString(),
        });
        snackbar.success('Quotation created successfully!');
      }
      setShowForm(false);
      setEditingQuotation(null);
    } catch (err) {
      console.error('Failed to save quotation:', err);
      snackbar.error(`Failed to save quotation: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [editingQuotation, updateQuotation, addQuotation, snackbar, user, quotations]);

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
    } catch {
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
    } catch {
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
    } catch {
      snackbar.error('Failed to add forwarder');
      throw new Error('Failed to add forwarder');
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
    } catch {
      snackbar.error('Failed to update forwarder');
      throw new Error('Failed to update forwarder');
    }
  }, [forwarders, updateForwarder, snackbar]);

  const handleAddAppUser = useCallback(async (data: AppUserInput) => {
    if (!canManageUsers) {
      snackbar.error('Only admins can manage users.');
      throw new Error('Access denied');
    }

    const duplicate = appUsers.some(item => item.email.toLowerCase() === data.email.trim().toLowerCase());
    if (duplicate) {
      snackbar.warning(`A user with "${data.email.trim()}" already exists.`);
      throw new Error('Duplicate user');
    }

    await addAppUser(data);
    snackbar.success(`User "${data.name}" created.`);
  }, [addAppUser, appUsers, canManageUsers, snackbar]);

  const handleEditAppUser = useCallback(async (id: number, data: AppUserInput) => {
    if (!canManageUsers) {
      snackbar.error('Only admins can manage users.');
      throw new Error('Access denied');
    }

    const duplicate = appUsers.some(item =>
      item.id !== id && item.email.toLowerCase() === data.email.trim().toLowerCase()
    );
    if (duplicate) {
      snackbar.warning(`A user with "${data.email.trim()}" already exists.`);
      throw new Error('Duplicate user');
    }

    await updateAppUser(id, data);
    snackbar.success(`User "${data.name}" updated.`);
  }, [appUsers, canManageUsers, snackbar, updateAppUser]);

  const handleDeleteAppUser = useCallback(async (id: number) => {
    if (!canManageUsers) {
      snackbar.error('Only admins can manage users.');
      return;
    }

    const target = appUsers.find(item => item.id === id);
    if (target?.email.toLowerCase() === user?.email?.toLowerCase()) {
      snackbar.warning('You cannot delete your own admin profile while signed in.');
      return;
    }

    await deleteAppUser(id);
    snackbar.success('User deleted.');
  }, [appUsers, canManageUsers, deleteAppUser, snackbar, user]);

  const handleAward = useCallback(async (id: number, forwarder: string) => {
    try {
      const q = quotations.find(item => item.id === id);
      let savingsUpdate = {};
      if (q && q.quotes.length >= 2) {
        const savings = calculateAwardSavings(q.quotes, q.poValueCurrency || 'AED', forwarder);
        if (savings !== null) savingsUpdate = { savings };
      }
      await updateQuotation(id, { awardedTo: forwarder, ...savingsUpdate });
      snackbar.success(`Quotation awarded to ${forwarder}!`);
    } catch {
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
        ? { approvedBy: getUserName(user), approvedAt: new Date().toISOString() }
        : {};
      await updateQuotation(id, { status, ...approvalStamp });
      snackbar.success(`Quotation status updated to ${status}!`);
    } catch {
      snackbar.error('Failed to update status');
    }
  }, [quotations, updateQuotation, snackbar, user]);

  const handleRejectSubmit = useCallback(async (reason: string) => {
    if (rejectTarget === null) return;
    try {
      await updateQuotation(rejectTarget, { status: 'Rejected', remarks: `Rejected: ${reason.trim() || 'No reason provided.'}` });
      snackbar.success('Quotation rejected!');
    } catch {
      snackbar.error('Failed to update status');
    }
    setRejectTarget(null);
  }, [rejectTarget, updateQuotation, snackbar]);

  const handleClone = useCallback((quotation: Quotation) => {
    setEditingQuotation({
      ...quotation,
      id: 0,
      status: 'Pending',
      awardedTo: '',
      savings: 0,
      createdBy: getUserName(user),
      createdAt: new Date().toISOString(),
      approvedBy: '',
      approvedAt: '',
      percentage: 0,
    });
    setShowForm(true);
  }, [user]);

  const handleAdd = useCallback(() => {
    setEditingQuotation(null);
    setShowForm(true);
  }, []);

  const handleExcludeToggle = useCallback(async (id: number, excluded: boolean) => {
    try {
      await updateQuotation(id, { excludedFromPO: excluded });
    } catch {
      snackbar.error('Failed to update exclusion setting');
    }
  }, [updateQuotation, snackbar]);

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
        modules={currentAccess.modules}
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
            <Route
              path="/"
              element={
                canAccess('dashboard')
                  ? <ErrorBoundary key="dashboard"><Dashboard quotations={quotations} forwarders={forwarders} displayCurrency={displayCurrency} onCurrencyChange={setDisplayCurrency} /></ErrorBoundary>
                  : <AccessDenied />
              }
            />
            <Route
              path="/quotations"
              element={
                canAccess('quotations')
                  ? (
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
                        onExcludeToggle={handleExcludeToggle}
                        onClone={handleClone}
                        displayCurrency={displayCurrency}
                      />
                    </ErrorBoundary>
                  )
                  : <AccessDenied />
              }
            />
            <Route
              path="/forwarders"
              element={
                canAccess('forwarders')
                  ? (
                    <ErrorBoundary key="forwarders">
                      <Forwarders
                        forwarders={forwarders}
                        onAdd={handleAddForwarder}
                        onEdit={handleEditForwarder}
                        onDelete={handleDeleteForwarder}
                      />
                    </ErrorBoundary>
                  )
                  : <AccessDenied />
              }
            />
            <Route
              path="/users"
              element={
                canManageUsers
                  ? (
                    <ErrorBoundary key="users">
                      <Users
                        users={appUsers}
                        onAdd={handleAddAppUser}
                        onEdit={handleEditAppUser}
                        onDelete={handleDeleteAppUser}
                      />
                    </ErrorBoundary>
                  )
                  : <AccessDenied />
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

      <MobileNav pendingApprovalsCount={pendingApprovalsCount} onAdd={handleAdd} modules={currentAccess.modules} />

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

function AppRouter() {
  const location = useLocation();
  if (location.pathname === '/reset-password') {
    return (
      <Suspense fallback={<PageLoader />}>
        <ResetPassword />
      </Suspense>
    );
  }

  return <AppContent />;
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
