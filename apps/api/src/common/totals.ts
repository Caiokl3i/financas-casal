export type Kind = 'income' | 'expense';

export interface TotalsItem {
  personId: string;
  kind: Kind;
  amountCents: number;
  paid: boolean;
}

export interface TotalsAllocation {
  amountCents: number;
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

export function calcTotals(
  items: TotalsItem[],
  allocations: TotalsAllocation[],
  personIds: string[] = [],
): Totals {
  const porPessoa: Totals['porPessoa'] = {};
  for (const id of personIds) porPessoa[id] = { entra: 0, sai: 0 };

  let entra = 0;
  let sai = 0;
  let jaPago = 0;
  for (const it of items) {
    const p = (porPessoa[it.personId] ??= { entra: 0, sai: 0 });
    if (it.kind === 'income') {
      entra += it.amountCents;
      p.entra += it.amountCents;
    } else {
      sai += it.amountCents;
      p.sai += it.amountCents;
      if (it.paid) jaPago += it.amountCents;
    }
  }
  const destinado = allocations.reduce((s, a) => s + a.amountCents, 0);
  const sobra = entra - sai;
  return {
    entra,
    sai,
    sobra,
    destinado,
    investir: sobra - destinado,
    jaPago,
    faltaPagar: sai - jaPago,
    porPessoa,
  };
}
