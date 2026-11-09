import { supabase } from './supabase';

export type Kind = 'income' | 'expense';
export type DestColor = 'pink' | 'blue' | 'ink';

export interface Person {
  id: string;
  name: string;
  color: 'blue' | 'pink';
}
export interface Item {
  id: string;
  personId: string;
  kind: Kind;
  description: string | null;
  amountCents: number;
  paid: boolean;
  position: number;
  updatedAt: string;
  updatedBy: string | null;
}
export interface Allocation {
  id: string;
  label: string;
  amountCents: number;
  color: DestColor;
  position: number;
  updatedAt: string;
  updatedBy: string | null;
}
export interface Totals {
  entra: number;
  sai: number;
  sobra: number;
  destinado: number;
  investir: number;
  jaPago: number;
  faltaPagar: number;
  porPessoa: Record<string, { entra: number; sai: number }>;
}
export interface Board {
  ym: string | null;
  people: Person[];
  items: Item[];
  allocations: Allocation[];
  totals: Totals;
  lastChange: { at: string; byName: string | null } | null;
}

/** Mesmo cálculo da API, usado para atualizar a tela na hora (antes da resposta). */
export function calcTotals(items: Item[], allocations: Allocation[], people: Person[]): Totals {
  const porPessoa: Totals['porPessoa'] = {};
  for (const p of people) porPessoa[p.id] = { entra: 0, sai: 0 };
  let entra = 0, sai = 0, jaPago = 0;
  for (const it of items) {
    const p = (porPessoa[it.personId] ??= { entra: 0, sai: 0 });
    if (it.kind === 'income') { entra += it.amountCents; p.entra += it.amountCents; }
    else { sai += it.amountCents; p.sai += it.amountCents; if (it.paid) jaPago += it.amountCents; }
  }
  const destinado = allocations.reduce((s, a) => s + a.amountCents, 0);
  const sobra = entra - sai;
  return { entra, sai, sobra, destinado, investir: sobra - destinado, jaPago, faltaPagar: sai - jaPago, porPessoa };
}

const BASE = (import.meta.env.VITE_API_URL as string).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (init.auth !== false) {
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Tente de novo.');
  }
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const raw = json?.message;
    const msg = Array.isArray(raw) ? raw.join(', ') : raw || 'Algo deu errado';
    if (res.status === 401 && init.auth !== false) await supabase.auth.signOut();
    throw new ApiError(res.status, msg);
  }
  return json as T;
}
