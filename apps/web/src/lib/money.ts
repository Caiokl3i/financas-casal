/** Formata centavos no padrão do artefato: "R$ 3.450", "R$ 1.501,89" ou sem símbolo "2.470", "6,89". */
export function formatBRL(cents: number, opts: { symbol?: boolean } = {}): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const hasCents = abs % 100 !== 0;
  const s = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(abs / 100);
  const sign = negative ? '−' : '';
  return opts.symbol === false ? `${sign}${s}` : `${sign}R$ ${s}`;
}

/** Valor em centavos para preencher o campo de edição: 247000 → "2470", 689 → "6,89". */
export function centsToInput(cents: number): string {
  if (cents % 100 === 0) return String(cents / 100);
  return (cents / 100).toFixed(2).replace('.', ',');
}

/**
 * Lê o que a pessoa digitou e devolve centavos (ou null se inválido).
 * Aceita "6,89", "6.89", "1.501,89", "1501", "R$ 1.501,89", "1,501.89".
 */
export function parseBRL(input: string): number | null {
  let s = input.replace(/R\$|\s/g, '');
  if (!s) return null;
  if (!/^[\d.,]+$/.test(s)) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    // o último separador é o decimal
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastComma >= 0) {
    s = s.replace(/\./g, '').replace(',', '.');
    if ((s.match(/\./g) ?? []).length > 1) return null;
  } else if (lastDot >= 0) {
    const parts = s.split('.');
    // "1.501" (milhar) vs "6.89" (decimal): 3 dígitos depois do ponto = milhar
    if (parts.length > 2 || parts[parts.length - 1].length === 3) s = parts.join('');
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
