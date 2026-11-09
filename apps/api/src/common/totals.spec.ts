import { describe, expect, it } from 'vitest';
import { calcTotals, TotalsItem } from './totals';

const C = 'caio';
const J = 'julia';
const inc = (personId: string, amountCents: number): TotalsItem => ({ personId, kind: 'income', amountCents, paid: false });
const exp = (personId: string, amountCents: number, paid = false): TotalsItem => ({ personId, kind: 'expense', amountCents, paid });

// Mesmos valores do artefato "Orçamento do Caio e da Júlia"
const seed: TotalsItem[] = [
  inc(C, 247000), inc(C, 43000), inc(C, 13000), inc(C, 42000),
  inc(J, 310000),
  exp(C, 60000), exp(C, 54000), exp(C, 40000), exp(C, 34500), exp(C, 13000), exp(C, 11000), exp(C, 3500),
  exp(J, 55000), exp(J, 40000), exp(J, 31000), exp(J, 9000), exp(J, 8500), exp(J, 3500), exp(J, 2500), exp(J, 689),
];
const allocations = [{ amountCents: 40000 }, { amountCents: 70000 }];

describe('calcTotals', () => {
  it('bate com os números do artefato', () => {
    const t = calcTotals(seed, allocations, [C, J]);
    expect(t.entra).toBe(655000);
    expect(t.sai).toBe(366189);
    expect(t.sobra).toBe(288811);
    expect(t.destinado).toBe(110000);
    expect(t.investir).toBe(178811);
    expect(t.porPessoa[C]).toEqual({ entra: 345000, sai: 216000 });
    expect(t.porPessoa[J]).toEqual({ entra: 310000, sai: 150189 });
  });

  it('separa pago e falta pagar', () => {
    const t = calcTotals([exp(C, 60000, true), exp(J, 689)], []);
    expect(t.jaPago).toBe(60000);
    expect(t.faltaPagar).toBe(689);
  });

  it('investir pode ficar negativo', () => {
    const t = calcTotals([inc(C, 1000)], [{ amountCents: 1500 }]);
    expect(t.investir).toBe(-500);
  });

  it('pessoa sem itens aparece zerada', () => {
    const t = calcTotals([], [], [C]);
    expect(t.porPessoa[C]).toEqual({ entra: 0, sai: 0 });
  });
});
