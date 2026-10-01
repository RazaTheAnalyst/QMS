"use client";

import useSWR from "swr";
import { useMemo } from "react";
import {
  fetchQuotations, createQuotation, updateQuotationAPI, deleteQuotationAPI,
  fetchForwarders, createForwarderAPI, updateForwarderAPI, deleteForwarderAPI,
  fetchAppUsers, createAppUserAPI, updateAppUserAPI, deleteAppUserAPI,
} from "@/lib/api";
import type { QuotationInput, Forwarder, AppUserInput } from "@/lib/domain";

export function useQmsData() {
  const q = useSWR("quotations", fetchQuotations);
  const f = useSWR("forwarders", fetchForwarders);
  const u = useSWR("appUsers", () => fetchAppUsers().catch(() => []), { onErrorRetry: (_e, _k, _c, _rc, opts) => { opts.retryCount = 0; } });

  const actions = useMemo(() => ({
    async addQuotation(input: QuotationInput) {
      const saved = await createQuotation(input);
      q.mutate();
      return saved;
    },
    async updateQuotation(id: number, patch: Partial<QuotationInput>) {
      const saved = await updateQuotationAPI(id, patch);
      q.mutate();
      return saved;
    },
    async deleteQuotation(id: number) {
      await deleteQuotationAPI(id);
      q.mutate();
    },
    async addForwarder(data: Omit<Forwarder, "id">) {
      const saved = await createForwarderAPI(data);
      f.mutate();
      return saved;
    },
    async updateForwarder(id: number, data: Omit<Forwarder, "id">) {
      const saved = await updateForwarderAPI(id, data);
      f.mutate();
      return saved;
    },
    async deleteForwarder(id: number) {
      await deleteForwarderAPI(id);
      f.mutate();
    },
    async addAppUser(data: AppUserInput) {
      const saved = await createAppUserAPI(data);
      u.mutate();
      return saved;
    },
    async updateAppUser(id: number, data: AppUserInput) {
      const saved = await updateAppUserAPI(id, data);
      u.mutate();
      return saved;
    },
    async deleteAppUser(id: number) {
      await deleteAppUserAPI(id);
      u.mutate();
    },
  }), [q, f, u]);

  return {
    quotations: q.data ?? [],
    forwarders: f.data ?? [],
    appUsers: u.data ?? [],
    loading: q.isLoading || f.isLoading || u.isLoading,
    error: (q.error ?? f.error) ? String((q.error ?? f.error)?.message ?? "Failed to load") : null,
    ...actions,
  };
}
