import { useState, useEffect, useCallback } from 'react';
import type { Quotation, QuotationInput, Forwarder } from './types';
import {
  fetchQuotations,
  createQuotation,
  updateQuotationAPI,
  deleteQuotationAPI,
  fetchForwarders,
  createForwarderAPI,
  deleteForwarderAPI,
  updateForwarderAPI,
} from './api';

export function useStore() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [forwarders, setForwarders] = useState<Forwarder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const [qData, fData] = await Promise.all([
          fetchQuotations(),
          fetchForwarders(),
        ]);
        if (!controller.signal.aborted) {
          setQuotations(qData);
          setForwarders(fData);
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
      percentage: 0,
      quotes: input.quotes ?? [],
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

  return {
    quotations,
    forwarders,
    addQuotation,
    updateQuotation,
    deleteQuotation,
    addForwarder,
    deleteForwarder,
    updateForwarder,
    loading,
    error,
  };
}
