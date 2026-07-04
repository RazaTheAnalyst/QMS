import { useState, useMemo, useCallback, lazy, Suspense, Component, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { LogOut, Plus, Search } from 'lucide-react';
import { useStore } from './store';
import { useAuth, AuthProvider } from './auth';
import { ThemeProvider, useTheme } from './theme';
import type { Quotation, QuotationInput, Filters, Forwarder } from './types';
import { ADMIN_EMAIL, convertCurrency } from './types';
import { Button } from './components/ui/button';
import { Alert, AlertDescription } from './components/ui/alert';
import { cn } from '@/lib/utils';

const Dashboard = lazy(() => import('./components/Dashboard'));
const QuotationTable = lazy(() => import('./components/QuotationTable'));
const QuotationForm = lazy(() => import('./components/QuotationForm'));
const SearchFilter = lazy(() => import('./components/SearchFilter'));
const Forwarders = lazy(() => import('./components/Forwarders'));
const LoginPage = lazy(() => import('./components/LoginPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 border-3 border-border border-t-primary rounded-full animate-spin" />
    </div>
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
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full p-8 rounded-xl border bg-card text-card-foreground shadow-lg">
            <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-muted-foreground my-3">{this.state.error}</p>
            <Button onClick={() => window.location.reload()}>Reload</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </Button>
  );
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
  filters,
  onFilterChange,
  filteredQuotations,
  quotations,
  forwarders,
  onEdit,
  onDelete,
  onAward,
  onStatusChange
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
      />
    </>
  );
});

function ConfirmDialog({ open, onConfirm, onCancel, title, description }: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-5">{description}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>Confirm</Button>
        </div>
      </div>
    </div>
  );
}

function RejectionPrompt({ open, onSubmit, onCancel }: {
  open: boolean;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold mb-2">Rejection Reason</h3>
        <p className="text-sm text-muted-foreground mb-3">Please enter the reason for rejection:</p>
        <textarea
          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Enter reason..."
          value={reason}
          onChange={e => setReason(e.target.value)}
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={() => onSubmit(reason)}>Reject</Button>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { session, user, loading: authLoading, signOut } = useAuth();
  const { quotations, forwarders, addQuotation, updateQuotation, deleteQuotation, addForwarder, deleteForwarder, updateForwarder, loading, error: storeError } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [filters, setFilters] = useState<Filters>({ search: '', entity: '', status: '' });
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
        toast.success('Quotation updated successfully!');
      } else {
        await addQuotation(input);
        toast.success('Quotation created successfully!');
      }
      setShowForm(false);
      setEditingQuotation(null);
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('Failed to save quotation');
    }
  }, [editingQuotation, updateQuotation, addQuotation]);

  const handleEdit = useCallback((quotation: Quotation) => {
    setEditingQuotation(quotation);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    if (user?.email !== ADMIN_EMAIL) {
      toast.error('Only the admin can delete quotations.');
      return;
    }
    setConfirmDelete(id);
  }, [user]);

  const handleConfirmDelete = useCallback(async () => {
    if (confirmDelete === null) return;
    try {
      await deleteQuotation(confirmDelete);
      toast.success('Quotation deleted successfully!');
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Failed to delete quotation');
    }
    setConfirmDelete(null);
  }, [confirmDelete, deleteQuotation]);

  const handleDeleteForwarder = useCallback(async (id: number) => {
    if (user?.email !== ADMIN_EMAIL) {
      toast.error('Only the admin can delete forwarders.');
      return;
    }
    setConfirmDeleteFwd(id);
  }, [user]);

  const handleConfirmDeleteFwd = useCallback(async () => {
    if (confirmDeleteFwd === null) return;
    try {
      await deleteForwarder(confirmDeleteFwd);
      toast.success('Forwarder deleted successfully!');
    } catch (err) {
      console.error('Delete forwarder failed:', err);
      toast.error('Failed to delete forwarder');
    }
    setConfirmDeleteFwd(null);
  }, [confirmDeleteFwd, deleteForwarder]);

  const handleAddForwarder = useCallback(async (data: Omit<Forwarder, 'id'>) => {
    const duplicate = forwarders.some(f => f.name.toLowerCase() === data.name.trim().toLowerCase());
    if (duplicate) {
      toast.warning(`A forwarder named "${data.name.trim()}" already exists.`);
      throw new Error('Duplicate forwarder');
    }
    try {
      await addForwarder(data);
      toast.success(`Forwarder "${data.name}" added successfully!`);
    } catch (err) {
      console.error('Failed to add forwarder:', err);
      toast.error('Failed to add forwarder');
      throw err;
    }
  }, [forwarders, addForwarder]);

  const handleEditForwarder = useCallback(async (id: number, data: Omit<Forwarder, 'id'>) => {
    const duplicate = forwarders.some(f => f.id !== id && f.name.toLowerCase() === data.name.trim().toLowerCase());
    if (duplicate) {
      toast.warning(`A forwarder named "${data.name.trim()}" already exists.`);
      throw new Error('Duplicate forwarder');
    }
    try {
      await updateForwarder(id, data);
      toast.success(`Forwarder "${data.name}" updated successfully!`);
    } catch (err) {
      console.error('Failed to update forwarder:', err);
      toast.error('Failed to update forwarder');
      throw err;
    }
  }, [forwarders, updateForwarder]);

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
      toast.success(`Quotation awarded to ${forwarder}!`);
    } catch (err) {
      console.error('Award failed:', err);
      toast.error('Failed to award forwarder');
    }
  }, [updateQuotation, quotations]);

  const handleStatusChange = useCallback(async (id: number, status: string) => {
    try {
      let remarksUpdate = {};
      if (status === 'Assign to forwarder') {
        const q = quotations.find(item => item.id === id);
        if (q && !q.awardedTo) {
          toast.warning('Please select a forwarder quote to award before approving.');
          return;
        }
      }
      if (status === 'Rejected') {
        setRejectTarget(id);
        return;
      }
      await updateQuotation(id, { status, ...remarksUpdate });
      toast.success(`Quotation status updated to ${status}!`);
    } catch (err) {
      console.error('Status update failed:', err);
      toast.error('Failed to update status');
    }
  }, [quotations, updateQuotation]);

  const handleRejectSubmit = useCallback(async (reason: string) => {
    if (rejectTarget === null) return;
    try {
      await updateQuotation(rejectTarget, { status: 'Rejected', remarks: `Rejected: ${reason.trim() || 'No reason provided.'}` });
      toast.success('Quotation rejected!');
    } catch (err) {
      console.error('Status update failed:', err);
      toast.error('Failed to update status');
    }
    setRejectTarget(null);
  }, [rejectTarget, updateQuotation]);

  const handleAdd = useCallback(() => {
    setEditingQuotation(null);
    setShowForm(true);
  }, []);

  if (authLoading) {
    return (
      <div className="login-page">
        <div className="login-bg">
          <div className="login-bg-orb login-bg-orb-1" />
          <div className="login-bg-orb login-bg-orb-2" />
          <div className="login-bg-orb login-bg-orb-3" />
        </div>
        <div className="loading-container">
          <div className="loading-spinner" />
          <div className="loading-text">Loading...</div>
        </div>
      </div>
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
      <div className="min-h-screen flex flex-col pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <div className="loading-container">
          <div className="loading-spinner" />
          <div className="loading-text">Loading quotations...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-dvh flex flex-col pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] relative">
      <Toaster position="bottom-right" richColors />

      <div className="login-bg" style={{ zIndex: 0, pointerEvents: 'none' }}>
        <div className="login-bg-orb login-bg-orb-1" />
        <div className="login-bg-orb login-bg-orb-2" />
        <div className="login-bg-orb login-bg-orb-3" />
      </div>

      {storeError && (
        <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
          <AlertDescription className="text-center text-sm">
            Error loading data: {storeError}
          </AlertDescription>
        </Alert>
      )}

      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/80 backdrop-blur-sm px-3 sm:px-5 border-b border-border h-[50px] h-[calc(50px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)]">
        <h1 className="text-sm font-semibold tracking-tight flex items-center gap-2 whitespace-nowrap flex-shrink-0">
          <img src="/logo.svg" alt="Logo" className="w-8 h-8 flex-shrink-0 drop-shadow-md" />
          <span className="hidden sm:inline">Quotation Manager</span>
        </h1>
        <nav className="flex items-center gap-0 flex-shrink min-w-0 overflow-x-auto scrollbar-none bg-muted rounded-[10px] p-[3px] border border-border">
          <NavLink to="/" end className={({ isActive }) => cn(
            "px-2.5 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium cursor-pointer border-none transition-all duration-200 tracking-tight whitespace-nowrap inline-flex items-center gap-[5px] bg-transparent min-h-[32px]",
            isActive ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground hover:bg-background"
          )}>
            Dashboard
          </NavLink>
          <NavLink to="/quotations" className={({ isActive }) => cn(
            "px-2.5 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium cursor-pointer border-none transition-all duration-200 tracking-tight whitespace-nowrap inline-flex items-center gap-[5px] bg-transparent min-h-[32px]",
            isActive ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground hover:bg-background"
          )}>
            Quotations
          </NavLink>
          <NavLink to="/forwarders" className={({ isActive }) => cn(
            "px-2.5 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium cursor-pointer border-none transition-all duration-200 tracking-tight whitespace-nowrap inline-flex items-center gap-[5px] bg-transparent min-h-[32px]",
            isActive ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground hover:bg-background"
          )}>
            Forwarders
          </NavLink>
          <Button
            size="sm"
            className="ml-1 sm:ml-1.5 h-[32px] text-[11px] sm:text-xs gap-1"
            onClick={handleAdd}
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
          <div className="flex items-center gap-1 sm:gap-2 ml-1 pl-1.5 sm:pl-2 border-l border-border flex-shrink-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap hidden md:inline">{user?.email}</span>
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={signOut} title="Sign out">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </nav>
      </header>

      <main className="flex-1 py-4 sm:py-7 px-4 sm:px-8 max-w-full relative z-10">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Dashboard quotations={quotations} forwarders={forwarders} />} />
            <Route
              path="/quotations"
              element={
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
              }
            />
            <Route
              path="/forwarders"
              element={
                <Forwarders
                  forwarders={forwarders}
                  onAdd={handleAddForwarder}
                  onEdit={handleEditForwarder}
                  onDelete={handleDeleteForwarder}
                />
              }
            />
            <Route path="*" element={
              <div className="text-center py-[60px] px-5 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <div className="text-[15px] font-medium">Page not found</div>
              </div>
            } />
          </Routes>
        </Suspense>
      </main>

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
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
