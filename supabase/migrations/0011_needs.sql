-- Necesidades / lista de compras pendientes por propiedad.
--
-- Distinct from Gastos: a "need" is something still to be bought (no
-- money has moved yet), so it doesn't touch accounts or transactions at
-- all — it's a checklist, not a ledger entry. Marking one "comprado"
-- just records that it happened; if the user wants it reflected in Caja
-- y bancos they still log it as a real Gasto (deliberately not automatic,
-- since the actual price/account/date paid may differ from the estimate).

create type need_status as enum ('pendiente', 'comprado', 'descartado');
create type need_priority as enum ('baja', 'media', 'alta');

create table needs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  environment_id uuid references environments(id) on delete set null,
  title text not null,
  notes text,
  estimated_cost numeric(14,2),
  priority need_priority not null default 'media',
  status need_status not null default 'pendiente',
  purchased_at date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on needs (organization_id);
create index on needs (property_id);

create trigger trg_needs_updated_at before update on needs
  for each row execute function fn_set_updated_at();

alter table needs enable row level security;

create policy needs_select on needs for select
  using (fn_is_org_member(organization_id));
create policy needs_write on needs for all
  using (fn_can_write(organization_id)) with check (fn_can_write(organization_id));

create trigger trg_audit_needs after insert or update or delete on needs
  for each row execute function fn_audit_log();
