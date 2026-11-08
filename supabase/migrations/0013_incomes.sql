-- Ingresos generales (ventas, entradas, donaciones) — distinct from
-- Reservas, which is specifically for lodging bookings (check-in/check-out,
-- huésped, plataforma Airbnb/Booking/Google). A property like ECOPARK
-- isn't a rental — its income is ticket sales, shop sales, etc., which
-- doesn't fit the Reservas shape at all. Ingresos mirrors Gastos exactly
-- (same account/payment-method/attachment pattern), just money in instead
-- of money out, for any property whose revenue isn't "reservations".

create table income_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  icon text,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table incomes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  environment_id uuid references environments(id) on delete set null,
  category_id uuid references income_categories(id),
  date date not null default current_date,
  amount numeric(14,2) not null,
  description text,
  received_by uuid references auth.users(id),
  received_from text,
  payment_method payment_method not null default 'caja',
  account_id uuid references accounts(id),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on incomes (organization_id);
create index on incomes (property_id);

create trigger trg_incomes_updated_at before update on incomes
  for each row execute function fn_set_updated_at();

alter table income_categories enable row level security;
alter table incomes enable row level security;

create policy income_categories_select on income_categories for select
  using (fn_is_org_member(organization_id));
create policy income_categories_write on income_categories for all
  using (fn_can_write(organization_id)) with check (fn_can_write(organization_id));

create policy incomes_select on incomes for select using (fn_is_org_member(organization_id));
create policy incomes_write on incomes for all
  using (fn_can_write(organization_id)) with check (fn_can_write(organization_id));

create trigger trg_audit_incomes after insert or update or delete on incomes
  for each row execute function fn_audit_log();
create trigger trg_audit_income_categories after insert or update or delete on income_categories
  for each row execute function fn_audit_log();

create or replace function fn_seed_income_categories(p_organization_id uuid) returns void as $$
begin
  insert into income_categories (organization_id, name, icon) values
    (p_organization_id, 'Entradas / tickets', 'ticket'),
    (p_organization_id, 'Ventas tienda', 'shopping-bag'),
    (p_organization_id, 'Alquiler de espacios', 'home'),
    (p_organization_id, 'Donaciones', 'heart'),
    (p_organization_id, 'Servicios', 'briefcase'),
    (p_organization_id, 'Otros', 'more-horizontal')
  on conflict (organization_id, name) do nothing;
end;
$$ language plpgsql security definer set search_path = public;

-- Backfill: every organization that already exists gets the default set.
do $$
declare
  org record;
begin
  for org in select id from organizations loop
    perform fn_seed_income_categories(org.id);
  end loop;
end $$;

-- New organizations get Ingresos categories seeded from day one too.
create or replace function fn_create_organization(
  p_org_name text,
  p_property_name text default null
) returns uuid as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into organizations (name) values (p_org_name) returning id into v_org_id;

  insert into organization_members (organization_id, user_id, role, initial_share_percentage)
  values (v_org_id, auth.uid(), 'admin', 100);

  perform fn_seed_expense_categories(v_org_id);
  perform fn_seed_income_categories(v_org_id);

  insert into accounts (organization_id, type, name, opening_balance)
  values (v_org_id, 'caja', 'Caja General', 0);

  if p_property_name is not null and length(trim(p_property_name)) > 0 then
    insert into properties (organization_id, name) values (v_org_id, p_property_name);
  end if;

  return v_org_id;
end;
$$ language plpgsql security definer set search_path = public;
