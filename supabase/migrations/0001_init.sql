-- Orçamento do Caio e da Júlia — estrutura inicial
-- Valores sempre em centavos (int). Acesso só para as pessoas cadastradas em `people` (via RLS).

create type public.item_kind    as enum ('income', 'expense');
create type public.dest_color   as enum ('pink', 'blue', 'ink');
create type public.person_color as enum ('blue', 'pink');

-- Pessoas (Caio e Júlia). O e-mail é a lista de quem pode entrar.
create table public.people (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  color         public.person_color not null,
  email         text not null unique check (email = lower(email)),
  position      int  not null default 0
);

create table public.template_items (
  id            uuid primary key default gen_random_uuid(),
  person_id     uuid not null references public.people(id) on delete cascade,
  kind          public.item_kind not null,
  description   text,
  amount_cents  int  not null check (amount_cents >= 0 and amount_cents <= 100000000),
  position      int  not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid references public.people(id) on delete set null
);
create index template_items_order_idx on public.template_items (person_id, kind, position);

create table public.template_allocations (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,
  amount_cents  int  not null check (amount_cents >= 0 and amount_cents <= 100000000),
  color         public.dest_color not null default 'pink',
  position      int  not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid references public.people(id) on delete set null
);

create table public.months (
  id            uuid primary key default gen_random_uuid(),
  ref_month     date not null unique check (extract(day from ref_month) = 1),
  created_at    timestamptz not null default now(),
  created_by    uuid references public.people(id) on delete set null
);

create table public.month_items (
  id               uuid primary key default gen_random_uuid(),
  month_id         uuid not null references public.months(id) on delete cascade,
  person_id        uuid not null references public.people(id) on delete cascade,
  kind             public.item_kind not null,
  description      text,
  amount_cents     int  not null check (amount_cents >= 0 and amount_cents <= 100000000),
  paid             boolean not null default false,
  paid_at          timestamptz,
  template_item_id uuid references public.template_items(id) on delete set null,
  position         int  not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  updated_by       uuid references public.people(id) on delete set null
);
create index month_items_order_idx on public.month_items (month_id, person_id, kind, position);
create index month_items_template_idx on public.month_items (template_item_id);

create table public.month_allocations (
  id            uuid primary key default gen_random_uuid(),
  month_id      uuid not null references public.months(id) on delete cascade,
  label         text not null,
  amount_cents  int  not null check (amount_cents >= 0 and amount_cents <= 100000000),
  color         public.dest_color not null default 'pink',
  position      int  not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid references public.people(id) on delete set null
);
create index month_allocations_order_idx on public.month_allocations (month_id, position);

-- Índices para as FKs de auditoria
create index template_items_updated_by_idx       on public.template_items (updated_by);
create index template_allocations_updated_by_idx on public.template_allocations (updated_by);
create index months_created_by_idx               on public.months (created_by);
create index month_items_person_idx              on public.month_items (person_id);
create index month_items_updated_by_idx          on public.month_items (updated_by);
create index month_allocations_updated_by_idx    on public.month_allocations (updated_by);

-- Quem está logado (pelo e-mail do token). Null se não for o Caio nem a Júlia.
create or replace function public.current_person_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.people p
  where p.email = lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

-- Auditoria: quem alterou e quando.
create or replace function public.set_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(public.current_person_id(), new.updated_by);
  return new;
end;
$$;

create trigger template_items_audit       before insert or update on public.template_items       for each row execute function public.set_audit();
create trigger template_allocations_audit before insert or update on public.template_allocations for each row execute function public.set_audit();
create trigger month_items_audit          before insert or update on public.month_items          for each row execute function public.set_audit();
create trigger month_allocations_audit    before insert or update on public.month_allocations    for each row execute function public.set_audit();

-- Marca/desmarca a data de pagamento junto com `paid`.
create or replace function public.set_paid_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.paid and (tg_op = 'INSERT' or not old.paid) then
    new.paid_at := now();
  elsif not new.paid then
    new.paid_at := null;
  end if;
  return new;
end;
$$;
create trigger month_items_paid_at before insert or update on public.month_items for each row execute function public.set_paid_at();

-- Segurança: RLS em tudo, só Caio e Júlia acessam.
alter table public.people               enable row level security;
alter table public.template_items       enable row level security;
alter table public.template_allocations enable row level security;
alter table public.months               enable row level security;
alter table public.month_items          enable row level security;
alter table public.month_allocations    enable row level security;

revoke all on public.people, public.template_items, public.template_allocations,
              public.months, public.month_items, public.month_allocations from anon;

create policy people_read on public.people
  for select to authenticated using ((select public.current_person_id()) is not null);

create policy template_items_all on public.template_items
  for all to authenticated
  using ((select public.current_person_id()) is not null)
  with check ((select public.current_person_id()) is not null);

create policy template_allocations_all on public.template_allocations
  for all to authenticated
  using ((select public.current_person_id()) is not null)
  with check ((select public.current_person_id()) is not null);

create policy months_all on public.months
  for all to authenticated
  using ((select public.current_person_id()) is not null)
  with check ((select public.current_person_id()) is not null);

create policy month_items_all on public.month_items
  for all to authenticated
  using ((select public.current_person_id()) is not null)
  with check ((select public.current_person_id()) is not null);

create policy month_allocations_all on public.month_allocations
  for all to authenticated
  using ((select public.current_person_id()) is not null)
  with check ((select public.current_person_id()) is not null);

-- Garante que o mês existe; na primeira vez copia o modelo fixo.
-- Roda com as permissões de quem chama (RLS vale normalmente).
create or replace function public.ensure_month(p_ref date)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_person uuid := public.current_person_id();
begin
  if v_person is null then
    raise exception 'não autorizado' using errcode = '42501';
  end if;
  if extract(day from p_ref) <> 1 then
    raise exception 'ref_month deve ser o dia 1' using errcode = '22023';
  end if;
  if p_ref > (date_trunc('month', now() at time zone 'America/Sao_Paulo') + interval '1 month')::date then
    raise exception 'só é possível abrir até 1 mês à frente' using errcode = '22023';
  end if;

  insert into public.months (ref_month, created_by)
  values (p_ref, v_person)
  on conflict (ref_month) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.months where ref_month = p_ref;
    return v_id;
  end if;

  insert into public.month_items (month_id, person_id, kind, description, amount_cents, position, template_item_id)
  select v_id, t.person_id, t.kind, t.description, t.amount_cents, t.position, t.id
  from public.template_items t;

  insert into public.month_allocations (month_id, label, amount_cents, color, position)
  select v_id, a.label, a.amount_cents, a.color, a.position
  from public.template_allocations a;

  return v_id;
end;
$$;

revoke execute on function public.ensure_month(date) from public, anon;
grant execute on function public.ensure_month(date) to authenticated;
revoke execute on function public.current_person_id() from public, anon;
grant execute on function public.current_person_id() to authenticated;
