import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { api, Allocation, Board, calcTotals, DestColor, Item, Kind } from './api';

export type Mode = { kind: 'month'; ym: string } | { kind: 'template' };

export const boardKey = (mode: Mode) => (mode.kind === 'month' ? ['board', 'month', mode.ym] : ['board', 'template']);

export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return session; // undefined = carregando
}

export function useBoard(mode: Mode, paused: boolean) {
  return useQuery({
    queryKey: boardKey(mode),
    queryFn: () => api<Board>(mode.kind === 'month' ? `/months/${mode.ym}` : '/template'),
    refetchOnWindowFocus: !paused,
    refetchInterval: paused ? false : 30_000,
  });
}

export interface NewItem {
  personId: string;
  kind: Kind;
  description: string | null;
  amountCents: number;
  repeat?: boolean;
}
export interface ItemPatch {
  description?: string | null;
  amountCents?: number;
  paid?: boolean;
}
export interface NewAllocation {
  label: string;
  amountCents: number;
  color: DestColor;
}
export type AllocationPatch = Partial<NewAllocation>;

/** Todas as ações de edição de um quadro (mês ou modelo), com atualização imediata na tela. */
export function useBoardActions(mode: Mode, onError: (msg: string) => void) {
  const qc = useQueryClient();
  const key = boardKey(mode);
  const m = mode.kind === 'month';

  const patchCache = (fn: (b: Board) => Pick<Board, 'items' | 'allocations'>) => {
    const prev = qc.getQueryData<Board>(key);
    if (prev) {
      const next = fn(prev);
      qc.setQueryData<Board>(key, { ...prev, ...next, totals: calcTotals(next.items, next.allocations, prev.people) });
    }
    return prev;
  };

  const common = {
    onError: (e: Error, _v: unknown, ctx: { prev?: Board } | undefined) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      onError(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  };

  const addItem = useMutation({
    mutationFn: (v: NewItem) =>
      api<Item>(m ? `/months/${mode.ym}/items` : '/template/items', { method: 'POST', body: m ? v : { ...v, repeat: undefined } }),
    ...common,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      if (m) qc.invalidateQueries({ queryKey: ['board', 'template'] });
    },
  });

  const updateItem = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ItemPatch }) =>
      api<Item>(m ? `/items/${id}` : `/template/items/${id}`, { method: 'PATCH', body: patch }),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = patchCache((b) => ({
        items: b.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
        allocations: b.allocations,
      }));
      return { prev };
    },
    ...common,
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => api(m ? `/items/${id}` : `/template/items/${id}`, { method: 'DELETE' }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = patchCache((b) => ({ items: b.items.filter((it) => it.id !== id), allocations: b.allocations }));
      return { prev };
    },
    ...common,
  });

  const addAllocation = useMutation({
    mutationFn: (v: NewAllocation) =>
      api<Allocation>(m ? `/months/${mode.ym}/allocations` : '/template/allocations', { method: 'POST', body: v }),
    ...common,
  });

  const updateAllocation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: AllocationPatch }) =>
      api<Allocation>(m ? `/allocations/${id}` : `/template/allocations/${id}`, { method: 'PATCH', body: patch }),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = patchCache((b) => ({
        items: b.items,
        allocations: b.allocations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      }));
      return { prev };
    },
    ...common,
  });

  const deleteAllocation = useMutation({
    mutationFn: (id: string) => api(m ? `/allocations/${id}` : `/template/allocations/${id}`, { method: 'DELETE' }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = patchCache((b) => ({ items: b.items, allocations: b.allocations.filter((a) => a.id !== id) }));
      return { prev };
    },
    ...common,
  });

  return {
    addItem: (v: NewItem) => addItem.mutateAsync(v),
    updateItem: (id: string, patch: ItemPatch) => updateItem.mutate({ id, patch }),
    deleteItem: (id: string) => deleteItem.mutate(id),
    addAllocation: (v: NewAllocation) => addAllocation.mutateAsync(v),
    updateAllocation: (id: string, patch: AllocationPatch) => updateAllocation.mutate({ id, patch }),
    deleteAllocation: (id: string) => deleteAllocation.mutate(id),
  };
}

export type BoardActions = ReturnType<typeof useBoardActions>;
