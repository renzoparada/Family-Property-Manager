-- Activos fijos — inventario de compras ya hechas y pagadas (muebles,
-- equipos, herramientas), distinto de Necesidades (pendientes de comprar,
-- sin plata movida) y de Gastos (el movimiento de caja real). Un activo
-- puede nacer de dos formas: manual, o "convertido" desde un ítem de
-- Necesidades ya marcado como comprado — en ese caso guarda de dónde
-- salió (source_need_id) para no poder convertirlo dos veces y para
-- poder mostrar en Necesidades qué ya está registrado como activo.
--
-- Deliberadamente no toca accounts/transactions: es un inventario, no
-- un movimiento de caja (ese ya quedó registrado, o se registra aparte,
-- como Gasto).

create table assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  environment_id uuid references environments(id) on delete set null,
  detail text not null,
  acquired_date date not null default current_date,
  cost numeric(14,2) not null default 0,
  quantity integer not null default 1,
  notes text,
  source_need_id uuid references needs(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on assets (organization_id);
create index on assets (property_id);

-- A need can only ever become one asset.
create unique index assets_source_need_id_key on assets (source_need_id)
  where source_need_id is not null;

create trigger trg_assets_updated_at before update on assets
  for each row execute function fn_set_updated_at();

alter table assets enable row level security;

create policy assets_select on assets for select
  using (fn_is_org_member(organization_id));
create policy assets_write on assets for all
  using (fn_can_write(organization_id)) with check (fn_can_write(organization_id));

create trigger trg_audit_assets after insert or update or delete on assets
  for each row execute function fn_audit_log();
