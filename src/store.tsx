import { useState, useEffect, useCallback } from 'react';
import type { Quotation, QuotationInput, Forwarder, AppUser, AppUserInput } from './types';
import {
  fetchQuotations,
  createQuotation,
  updateQuotationAPI,
  deleteQuotationAPI,
  fetchForwarders,
  createForwarderAPI,
  deleteForwarderAPI,
  updateForwarderAPI,
  fetchAppUsers,
  createAppUserAPI,
  updateAppUserAPI,
  deleteAppUserAPI,
} from './api';

export function useStore() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [forwarders, setForwarders] = useState<Forwarder[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const [qData, fData, uData] = await Promise.all([
          fetchQuotations(),
          fetchForwarders(),
          fetchAppUsers().catch(() => {
            return [] as AppUser[];
          }),
        ]);
        if (!controller.signal.aborted) {
          setQuotations(qData);
          setForwarders(fData);
          setAppUsers(uData);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          const msg = err instanceof Error ? err.message : 'Failed to load data';
          setError(msg);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();
    return () => controller.abort();
  }, []);

  const addQuotation = useCallback(async (input: QuotationInput) => {
    const optimistic: Quotation = {
      id: Date.now(),
      ...input,
      poValueCurrency: input.poValueCurrency ?? 'AED',
      percentage: 0,
      quotes: input.quotes ?? [],
      createdBy: input.createdBy ?? '',
      createdAt: input.createdAt ?? '',
      approvedBy: input.approvedBy ?? '',
      approvedAt: input.approvedAt ?? '',
    };
    setQuotations(prev => [...prev, optimistic]);
    try {
      const saved = await createQuotation(input);
      setQuotations(prev => prev.map(q => q.id === optimistic.id ? saved : q));
    } catch (err) {
      setQuotations(prev => prev.filter(q => q.id !== optimistic.id));
      throw err;
    }
  }, []);

  const updateQuotation = useCallback(async (id: number, updated: Partial<QuotationInput>) => {
    let previousQuotation: Quotation | undefined;
    setQuotations(prev => {
      previousQuotation = prev.find(q => q.id === id);
      return prev.map(q => q.id === id ? { ...q, ...updated } : q);
    });
    try {
      const saved = await updateQuotationAPI(id, updated);
      setQuotations(prev => prev.map(q => q.id === id ? saved : q));
    } catch (err) {
      if (previousQuotation) {
        setQuotations(prev => prev.map(q => q.id === id ? previousQuotation! : q));
      }
      throw err;
    }
  }, []);

  const deleteQuotation = useCallback(async (id: number) => {
    let deletedQuotation: Quotation | undefined;
    setQuotations(prev => {
      deletedQuotation = prev.find(q => q.id === id);
      return prev.filter(q => q.id !== id);
    });
    try {
      await deleteQuotationAPI(id);
    } catch (err) {
      if (deletedQuotation) {
        setQuotations(prev => [...prev, deletedQuotation!].sort((a, b) => a.id - b.id));
      }
      throw err;
    }
  }, []);

  const addForwarder = useCallback(async (data: Omit<Forwarder, 'id'>) => {
    const optimistic: Forwarder = { id: Date.now(), ...data };
    setForwarders(prev => [...prev, optimistic]);
    try {
      const saved = await createForwarderAPI(data);
      setForwarders(prev => prev.map(f => f.id === optimistic.id ? saved : f));
    } catch (err) {
      setForwarders(prev => prev.filter(f => f.id !== optimistic.id));
      throw err;
    }
  }, []);

  const deleteForwarder = useCallback(async (id: number) => {
    let deletedForwarder: Forwarder | undefined;
    setForwarders(prev => {
      deletedForwarder = prev.find(f => f.id === id);
      return prev.filter(f => f.id !== id);
    });
    try {
      await deleteForwarderAPI(id);
    } catch (err) {
      if (deletedForwarder) {
        setForwarders(prev => [...prev, deletedForwarder!].sort((a, b) => a.id - b.id));
      }
      throw err;
    }
  }, []);

  const updateForwarder = useCallback(async (id: number, data: Omit<Forwarder, 'id'>) => {
    let previousForwarder: Forwarder | undefined;
    setForwarders(prev => {
      previousForwarder = prev.find(f => f.id === id);
      return prev.map(f => f.id === id ? { ...f, ...data } : f);
    });
    try {
      const saved = await updateForwarderAPI(id, data);
      setForwarders(prev => prev.map(f => f.id === id ? saved : f));
    } catch (err) {
      if (previousForwarder) {
        setForwarders(prev => prev.map(f => f.id === id ? previousForwarder! : f));
      }
      throw err;
    }
  }, []);

  const addAppUser = useCallback(async (input: AppUserInput) => {
    const optimistic: AppUser = {
      id: Date.now(),
      ...input,
      email: input.email.toLowerCase().trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAppUsers(prev => [...prev, optimistic].sort((a, b) => a.name.localeCompare(b.name)));
    try {
      const saved = await createAppUserAPI(input);
      setAppUsers(prev => prev.map(u => u.id === optimistic.id ? saved : u).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setAppUsers(prev => prev.filter(u => u.id !== optimistic.id));
      throw err;
    }
  }, []);

  const updateAppUser = useCallback(async (id: number, input: AppUserInput) => {
    let previousUser: AppUser | undefined;
    setAppUsers(prev => {
      previousUser = prev.find(u => u.id === id);
      return prev.map(u => u.id === id ? { ...u, ...input, email: input.email.toLowerCase().trim(), updatedAt: new Date().toISOString() } : u)
        .sort((a, b) => a.name.localeCompare(b.name));
    });
    try {
      const saved = await updateAppUserAPI(id, input);
      setAppUsers(prev => prev.map(u => u.id === id ? saved : u).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      if (previousUser) {
        setAppUsers(prev => prev.map(u => u.id === id ? previousUser! : u));
      }
      throw err;
    }
  }, []);

  const deleteAppUser = useCallback(async (id: number) => {
    let deletedUser: AppUser | undefined;
    setAppUsers(prev => {
      deletedUser = prev.find(u => u.id === id);
      return prev.filter(u => u.id !== id);
    });
    try {
      await deleteAppUserAPI(id);
    } catch (err) {
      if (deletedUser) {
        setAppUsers(prev => [...prev, deletedUser!].sort((a, b) => a.name.localeCompare(b.name)));
      }
      throw err;
    }
  }, []);

  return {
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
    error,
  };
}
