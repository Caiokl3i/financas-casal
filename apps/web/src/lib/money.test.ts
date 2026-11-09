import { describe, expect, it } from 'vitest';
import { centsToInput, formatBRL, parseBRL } from './money';

describe('formatBRL', () => {
  it('formata como no artefato', () => {
    expect(formatBRL(345000)).toBe('R$ 3.450');
    expect(formatBRL(150189)).toBe('R$ 1.501,89');
    expect(formatBRL(655000)).toBe('R$ 6.550');
    expect(formatBRL(247000, { symbol: false })).toBe('2.470');
    expect(formatBRL(689, { symbol: false })).toBe('6,89');
    expect(formatBRL(288811, { symbol: false })).toBe('2.888,11');
  });
  it('negativo usa sinal de menos', () => {
    expect(formatBRL(-50000)).toBe('−R$ 500');
  });
});

describe('parseBRL', () => {
  it('aceita formatos comuns', () => {
    expect(parseBRL('6,89')).toBe(689);
    expect(parseBRL('6.89')).toBe(689);
    expect(parseBRL('1.501,89')).toBe(150189);
    expect(parseBRL('1501')).toBe(150100);
    expect(parseBRL('1.501')).toBe(150100);
    expect(parseBRL('R$ 2.470')).toBe(247000);
    expect(parseBRL('1,501.89')).toBe(150189);
    expect(parseBRL('0')).toBe(0);
  });
  it('rejeita lixo', () => {
    expect(parseBRL('')).toBeNull();
    expect(parseBRL('abc')).toBeNull();
    expect(parseBRL('-5')).toBeNull();
  });
});

describe('centsToInput', () => {
  it('volta para texto editável', () => {
    expect(centsToInput(247000)).toBe('2470');
    expect(centsToInput(689)).toBe('6,89');
  });
});
