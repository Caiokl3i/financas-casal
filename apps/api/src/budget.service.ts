import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { calcTotals, Kind, Totals } from './common/totals';
import { unwrap } from './supabase';
import type { CreateAllocationDto, CreateItemDto, UpdateAllocationDto, UpdateItemDto } from './dto';

export interface PersonView {
  id: string;
  name: string;
  color: 'blue' | 'pink';
}
export interface ItemView {
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
export interface AllocationView {
  id: string;
  label: string;
  amountCents: number;
  color: 'pink' | 'blue' | 'ink';
  position: number;
  updatedAt: string;
  updatedBy: string | null;
}
export interface BoardView {
  ym: string | null;
  people: PersonView[];
  items: ItemView[];
  allocations: AllocationView[];
  totals: Totals;
  lastChange: { at: string; byName: string | null } | null;
}

type Scope = { kind: 'month'; monthId: string; ym: string } | { kind: 'template' };

const YM = /^\d{4}-(0[1-9]|1[0-2])$/;

export function parseYm(ym: string): string {
  if (!YM.test(ym)) throw new BadRequestException('Mês inválido, use AAAA-MM');
  return `${ym}-01`;
}

const itemTable = (s: Scope) => (s.kind === 'month' ? 'month_items' : 'template_items');
const allocTable = (s: Scope) => (s.kind === 'month' ? 'month_allocations' : 'template_allocations');

/* eslint-disable @typescript-eslint/no-explicit-any */
function toItem(r: any): ItemView {
  return {
    id: r.id,
    personId: r.person_id,
    kind: r.kind,
    description: r.description,
    amountCents: r.amount_cents,
    paid: r.paid ?? false,
    position: r.position,
    updatedAt: r.updated_at,
    updatedBy: r.updated_by,
  };
}
function toAlloc(r: any): AllocationView {
  return {
    id: r.id,
    label: r.label,
    amountCents: r.amount_cents,
    color: r.color,
    position: r.position,
    updatedAt: r.updated_at,
    updatedBy: r.updated_by,
  };
}

@Injectable()
export class BudgetService {
  async people(sb: SupabaseClient): Promise<PersonView[]> {
    return unwrap(await sb.from('people').select('id, name, color').order('position'));
  }

  /** Abre o mês (cria a partir do modelo na primeira vez). */
  async month(sb: SupabaseClient, ym: string): Promise<BoardView> {
    const ref = parseYm(ym);
    const monthId = unwrap(await sb.rpc('ensure_month', { p_ref: ref })) as string;
    return this.board(sb, { kind: 'month', monthId, ym });
  }

  async template(sb: SupabaseClient): Promise<BoardView> {
    return this.board(sb, { kind: 'template' });
  }

  private async board(sb: SupabaseClient, scope: Scope): Promise<BoardView> {
    const itemCols =
      scope.kind === 'month'
        ? 'id, person_id, kind, description, amount_cents, paid, position, updated_at, updated_by'
        : 'id, person_id, kind, description, amount_cents, position, updated_at, updated_by';

    let itemsQ = sb.from(itemTable(scope)).select(itemCols).order('position').order('created_at');
    let allocQ = sb
      .from(allocTable(scope))
      .select('id, label, amount_cents, color, position, updated_at, updated_by')
      .order('position')
      .order('created_at');
    if (scope.kind === 'month') {
      itemsQ = itemsQ.eq('month_id', scope.monthId);
      allocQ = allocQ.eq('month_id', scope.monthId);
    }

    const [people, itemsRes, allocRes] = await Promise.all([this.people(sb), itemsQ, allocQ]);
    const items = (unwrap(itemsRes) as any[]).map(toItem);
    const allocations = (unwrap(allocRes) as any[]).map(toAlloc);

    const totals = calcTotals(items, allocations, people.map((p) => p.id));

    let last: { updatedAt: string; updatedBy: string | null } | null = null;
    for (const r of [...items, ...allocations]) {
      if (!last || r.updatedAt > last.updatedAt) last = r;
    }
    const lastChange = last
      ? { at: last.updatedAt, byName: people.find((p) => p.id === last!.updatedBy)?.name ?? null }
      : null;

    return { ym: scope.kind === 'month' ? scope.ym : null, people, items, allocations, totals, lastChange };
  }

  private async nextPosition(sb: SupabaseClient, table: string, filter: Record<string, string>) {
    let q = sb.from(table).select('position').order('position', { ascending: false }).limit(1);
    for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
    const rows = unwrap(await q) as { position: number }[];
    return rows.length ? rows[0].position + 1 : 0;
  }

  // ---------- Itens ----------

  async addMonthItem(sb: SupabaseClient, ym: string, dto: CreateItemDto): Promise<ItemView> {
    const ref = parseYm(ym);
    const monthId = unwrap(await sb.rpc('ensure_month', { p_ref: ref })) as string;

    let templateItemId: string | null = null;
    if (dto.repeat) {
      const t = await this.addTemplateItem(sb, dto);
      templateItemId = t.id;
    }
    const position = await this.nextPosition(sb, 'month_items', {
      month_id: monthId,
      person_id: dto.personId,
      kind: dto.kind,
    });
    const row = unwrap(
      await sb
        .from('month_items')
        .insert({
          month_id: monthId,
          person_id: dto.personId,
          kind: dto.kind,
          description: dto.description ?? null,
          amount_cents: dto.amountCents,
          template_item_id: templateItemId,
          position,
        })
        .select()
        .single(),
    );
    return toItem(row);
  }

  async addTemplateItem(sb: SupabaseClient, dto: CreateItemDto): Promise<ItemView> {
    const position = await this.nextPosition(sb, 'template_items', { person_id: dto.personId, kind: dto.kind });
    const row = unwrap(
      await sb
        .from('template_items')
        .insert({
          person_id: dto.personId,
          kind: dto.kind,
          description: dto.description ?? null,
          amount_cents: dto.amountCents,
          position,
        })
        .select()
        .single(),
    );
    return toItem(row);
  }

  async updateItem(sb: SupabaseClient, table: 'month_items' | 'template_items', id: string, dto: UpdateItemDto) {
    const patch: Record<string, unknown> = {};
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.amountCents !== undefined) patch.amount_cents = dto.amountCents;
    if (dto.paid !== undefined && table === 'month_items') patch.paid = dto.paid;
    if (!Object.keys(patch).length) throw new BadRequestException('Nada para alterar');
    const rows = unwrap(await sb.from(table).update(patch).eq('id', id).select()) as any[];
    if (!rows.length) throw new NotFoundException('Item não encontrado');
    return toItem(rows[0]);
  }

  async deleteRow(sb: SupabaseClient, table: string, id: string) {
    const rows = unwrap(await sb.from(table).delete().eq('id', id).select('id')) as any[];
    if (!rows.length) throw new NotFoundException('Não encontrado');
    return { ok: true };
  }

  // ---------- Destinos da sobra ----------

  async addMonthAllocation(sb: SupabaseClient, ym: string, dto: CreateAllocationDto) {
    const monthId = unwrap(await sb.rpc('ensure_month', { p_ref: parseYm(ym) })) as string;
    const position = await this.nextPosition(sb, 'month_allocations', { month_id: monthId });
    const row = unwrap(
      await sb
        .from('month_allocations')
        .insert({ month_id: monthId, label: dto.label, amount_cents: dto.amountCents, color: dto.color, position })
        .select()
        .single(),
    );
    return toAlloc(row);
  }

  async addTemplateAllocation(sb: SupabaseClient, dto: CreateAllocationDto) {
    const position = await this.nextPosition(sb, 'template_allocations', {});
    const row = unwrap(
      await sb
        .from('template_allocations')
        .insert({ label: dto.label, amount_cents: dto.amountCents, color: dto.color, position })
        .select()
        .single(),
    );
    return toAlloc(row);
  }

  async updateAllocation(
    sb: SupabaseClient,
    table: 'month_allocations' | 'template_allocations',
    id: string,
    dto: UpdateAllocationDto,
  ) {
    const patch: Record<string, unknown> = {};
    if (dto.label !== undefined) patch.label = dto.label;
    if (dto.amountCents !== undefined) patch.amount_cents = dto.amountCents;
    if (dto.color !== undefined) patch.color = dto.color;
    if (!Object.keys(patch).length) throw new BadRequestException('Nada para alterar');
    const rows = unwrap(await sb.from(table).update(patch).eq('id', id).select()) as any[];
    if (!rows.length) throw new NotFoundException('Destino não encontrado');
    return toAlloc(rows[0]);
  }
}
