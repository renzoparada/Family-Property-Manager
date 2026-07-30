-- Family Property Manager — core schema
-- Multi-tenant model: one "organization" = one family. Every domain table is
-- scoped to an organization and protected by RLS via organization_members.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────

create type member_role as enum ('admin', 'socio', 'contador', 'invitado');
create type reservation_platform as enum ('airbnb', 'booking', 'google', 'directo', 'otro');
create type reservation_status as enum ('pagado', 'pendiente', 'cancelado');
create type payment_method as enum ('caja', 'banco', 'transferencia', 'qr', 'tarjeta');
create type account_type as enum ('caja', 'banco');
create type loan_status as enum ('pendiente', 'parcial', 'pagado');
create type audit_action as enum ('insert', 'update', 'delete');

-- ─────────────────────────────────────────────────────────────────────────
-- Tenancy & identity
-- ─────────────────────────────────────────────────────────────────────────

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'BOB',
  created_at timestamptz not null default now()
);

-- Extends auth.users with the profile fields the spec asks for.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  whatsapp text,
  email text,
  created_at timestamptz not null default now()
);

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null default 'socio',
  -- Original, negotiated ownership stake. Never mutated automatically —
  -- only an admin edits this directly. Dynamic participation from
  -- investments is computed at query time from the investments table.
  initial_share_percentage numeric(6,3) not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index on organization_members (user_id);
create index on organization_members (organization_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Properties & environments
-- ─────────────────────────────────────────────────────────────────────────

create table properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index on properties (organization_id);

create table environments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index on environments (property_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Accounts (Caja + Bancos) and their movement ledger
-- ─────────────────────────────────────────────────────────────────────────

create table accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type account_type not null,
  name text not null,
  bank_name text,
  account_number text,
  opening_balance numeric(14,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index on accounts (organization_id);

-- Single ledger for every account movement. Domain writes (expenses,
-- reservations, loans, investments...) insert a matching row here so the
-- account balance is always `opening_balance + sum(signed_amount)`.
create table transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete restrict,
  date date not null default current_date,
  -- Positive = money in, negative = money out.
  amount numeric(14,2) not null,
  description text,
  source_type text, -- 'reservation' | 'expense' | 'loan' | 'loan_payment' | 'investment' | 'manual'
  source_id uuid,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index on transactions (organization_id);
create index on transactions (account_id);
create index on transactions (source_type, source_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Reservations (income)
-- ─────────────────────────────────────────────────────────────────────────

create table reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  environment_id uuid references environments(id) on delete set null,
  check_in date not null,
  check_out date not null,
  guest_name text not null,
  platform reservation_platform not null default 'directo',
  gross_amount numeric(14,2) not null default 0,
  commission_amount numeric(14,2) not null default 0,
  net_amount numeric(14,2) generated always as (gross_amount - commission_amount) stored,
  status reservation_status not null default 'pendiente',
  account_id uuid references accounts(id),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in)
);

create index on reservations (organization_id);
create index on reservations (property_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Expenses
-- ─────────────────────────────────────────────────────────────────────────

create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  icon text,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  environment_id uuid references environments(id) on delete set null,
  category_id uuid references expense_categories(id),
  date date not null default current_date,
  amount numeric(14,2) not null,
  description text,
  paid_by uuid references auth.users(id),
  paid_to text,
  payment_method payment_method not null default 'caja',
  account_id uuid references accounts(id),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on expenses (organization_id);
create index on expenses (property_id);
create index on expenses (category_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Investments (capital, distinct from expenses)
-- ─────────────────────────────────────────────────────────────────────────

create table investments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  environment_id uuid references environments(id) on delete set null,
  member_id uuid not null references organization_members(id) on delete cascade,
  date date not null default current_date,
  amount numeric(14,2) not null,
  description text not null,
  account_id uuid references accounts(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index on investments (organization_id);
create index on investments (member_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Family loans (payables to family members — NOT expenses)
-- ─────────────────────────────────────────────────────────────────────────

create table loans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  member_id uuid not null references organization_members(id) on delete cascade,
  date date not null default current_date,
  amount numeric(14,2) not null,
  description text,
  interest_rate numeric(6,3) default 0,
  status loan_status not null default 'pendiente',
  account_id uuid references accounts(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index on loans (organization_id);
create index on loans (member_id);

create table loan_payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans(id) on delete cascade,
  date date not null default current_date,
  amount numeric(14,2) not null,
  notes text,
  account_id uuid references accounts(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index on loan_payments (loan_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Profit distribution
-- ─────────────────────────────────────────────────────────────────────────

create table profit_distributions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  total_profit numeric(14,2) not null,
  method text not null default 'shares', -- 'shares' | 'custom'
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table profit_distribution_lines (
  id uuid primary key default gen_random_uuid(),
  distribution_id uuid not null references profit_distributions(id) on delete cascade,
  member_id uuid not null references organization_members(id) on delete cascade,
  percentage numeric(6,3) not null,
  amount numeric(14,2) not null
);

create index on profit_distribution_lines (distribution_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Attachments (photos, invoices, receipts, PDFs — stored in Supabase Storage)
-- ─────────────────────────────────────────────────────────────────────────

create table attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  entity_type text not null, -- 'reservation' | 'expense' | 'investment' | 'loan' | 'loan_payment'
  entity_id uuid not null,
  file_path text not null, -- path inside the 'attachments' storage bucket
  file_name text not null,
  file_type text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index on attachments (organization_id);
create index on attachments (entity_type, entity_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Audit log
-- ─────────────────────────────────────────────────────────────────────────

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  table_name text not null,
  record_id uuid not null,
  action audit_action not null,
  user_id uuid references auth.users(id),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index on audit_log (organization_id);
create index on audit_log (table_name, record_id);

create or replace function fn_audit_log() returns trigger as $$
declare
  v_org uuid;
begin
  v_org := coalesce(
    case when TG_OP = 'DELETE' then old.organization_id else new.organization_id end,
    null
  );
  insert into audit_log (organization_id, table_name, record_id, action, user_id, old_data, new_data)
  values (
    v_org,
    TG_TABLE_NAME,
    case when TG_OP = 'DELETE' then old.id else new.id end,
    lower(TG_OP)::audit_action,
    auth.uid(),
    case when TG_OP in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('UPDATE','INSERT') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_audit_expenses after insert or update or delete on expenses
  for each row execute function fn_audit_log();
create trigger trg_audit_reservations after insert or update or delete on reservations
  for each row execute function fn_audit_log();
create trigger trg_audit_investments after insert or update or delete on investments
  for each row execute function fn_audit_log();
create trigger trg_audit_loans after insert or update or delete on loans
  for each row execute function fn_audit_log();
create trigger trg_audit_loan_payments after insert or update or delete on loan_payments
  for each row execute function fn_audit_log();
create trigger trg_audit_properties after insert or update or delete on properties
  for each row execute function fn_audit_log();
create trigger trg_audit_environments after insert or update or delete on environments
  for each row execute function fn_audit_log();
create trigger trg_audit_organization_members after insert or update or delete on organization_members
  for each row execute function fn_audit_log();

-- keep updated_at fresh
create or replace function fn_set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_expenses_updated_at before update on expenses
  for each row execute function fn_set_updated_at();
create trigger trg_reservations_updated_at before update on reservations
  for each row execute function fn_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Helper: does the current user belong to this organization, and with
-- what minimum privilege? Marked STABLE + security definer so RLS
-- policies can call it without recursive-RLS issues on organization_members.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function fn_is_org_member(p_organization_id uuid) returns boolean as $$
  select exists (
    select 1 from organization_members
    where organization_id = p_organization_id and user_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

create or replace function fn_can_write(p_organization_id uuid) returns boolean as $$
  select exists (
    select 1 from organization_members
    where organization_id = p_organization_id
      and user_id = auth.uid()
      and role in ('admin', 'socio', 'contador')
  );
$$ language sql stable security definer set search_path = public;

create or replace function fn_is_admin(p_organization_id uuid) returns boolean as $$
  select exists (
    select 1 from organization_members
    where organization_id = p_organization_id
      and user_id = auth.uid()
      and role = 'admin'
  );
$$ language sql stable security definer set search_path = public;

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table organization_members enable row level security;
alter table properties enable row level security;
alter table environments enable row level security;
alter table accounts enable row level security;
alter table transactions enable row level security;
alter table reservations enable row level security;
alter table expense_categories enable row level security;
alter table expenses enable row level security;
alter table investments enable row level security;
alter table loans enable row level security;
alter table loan_payments enable row level security;
alter table profit_distributions enable row level security;
alter table profit_distribution_lines enable row level security;
alter table attachments enable row level security;
alter table audit_log enable row level security;

-- profiles: a user manages their own profile; org-mates can read each other's
create policy profiles_select on profiles for select
  using (id = auth.uid() or exists (
    select 1 from organization_members m1
    join organization_members m2 on m1.organization_id = m2.organization_id
    where m1.user_id = auth.uid() and m2.user_id = profiles.id
  ));
create policy profiles_upsert on profiles for insert with check (id = auth.uid());
create policy profiles_update on profiles for update using (id = auth.uid());

-- organizations: visible to members; creatable by any authenticated user
create policy organizations_select on organizations for select
  using (fn_is_org_member(id));
create policy organizations_insert on organizations for insert
  with check (auth.uid() is not null);
create policy organizations_update on organizations for update
  using (fn_is_admin(id));

-- organization_members: visible to fellow members; writable by admins.
-- A user may also insert their own first membership row when they create
-- an organization (handled in the app in the same transaction as the org).
create policy org_members_select on organization_members for select
  using (fn_is_org_member(organization_id));
create policy org_members_insert on organization_members for insert
  with check (fn_is_admin(organization_id) or user_id = auth.uid());
create policy org_members_update on organization_members for update
  using (fn_is_admin(organization_id));
create policy org_members_delete on organization_members for delete
  using (fn_is_admin(organization_id));

-- Generic pattern for org-scoped domain tables: members read, writers
-- (admin/socio/contador) write, 'invitado' is read-only.
create policy properties_select on properties for select using (fn_is_org_member(organization_id));
create policy properties_write on properties for all
  using (fn_can_write(organization_id)) with check (fn_can_write(organization_id));

create policy environments_select on environments for select
  using (fn_is_org_member((select organization_id from properties where id = environments.property_id)));
create policy environments_write on environments for all
  using (fn_can_write((select organization_id from properties where id = environments.property_id)))
  with check (fn_can_write((select organization_id from properties where id = environments.property_id)));

create policy accounts_select on accounts for select using (fn_is_org_member(organization_id));
create policy accounts_write on accounts for all
  using (fn_can_write(organization_id)) with check (fn_can_write(organization_id));

create policy transactions_select on transactions for select using (fn_is_org_member(organization_id));
create policy transactions_write on transactions for all
  using (fn_can_write(organization_id)) with check (fn_can_write(organization_id));

create policy reservations_select on reservations for select using (fn_is_org_member(organization_id));
create policy reservations_write on reservations for all
  using (fn_can_write(organization_id)) with check (fn_can_write(organization_id));

create policy expense_categories_select on expense_categories for select using (fn_is_org_member(organization_id));
create policy expense_categories_write on expense_categories for all
  using (fn_can_write(organization_id)) with check (fn_can_write(organization_id));

create policy expenses_select on expenses for select using (fn_is_org_member(organization_id));
create policy expenses_write on expenses for all
  using (fn_can_write(organization_id)) with check (fn_can_write(organization_id));

create policy investments_select on investments for select using (fn_is_org_member(organization_id));
create policy investments_write on investments for all
  using (fn_can_write(organization_id)) with check (fn_can_write(organization_id));

create policy loans_select on loans for select using (fn_is_org_member(organization_id));
create policy loans_write on loans for all
  using (fn_can_write(organization_id)) with check (fn_can_write(organization_id));

create policy loan_payments_select on loan_payments for select
  using (fn_is_org_member((select organization_id from loans where id = loan_payments.loan_id)));
create policy loan_payments_write on loan_payments for all
  using (fn_can_write((select organization_id from loans where id = loan_payments.loan_id)))
  with check (fn_can_write((select organization_id from loans where id = loan_payments.loan_id)));

create policy profit_distributions_select on profit_distributions for select using (fn_is_org_member(organization_id));
create policy profit_distributions_write on profit_distributions for all
  using (fn_is_admin(organization_id)) with check (fn_is_admin(organization_id));

create policy profit_distribution_lines_select on profit_distribution_lines for select
  using (fn_is_org_member((select organization_id from profit_distributions where id = profit_distribution_lines.distribution_id)));
create policy profit_distribution_lines_write on profit_distribution_lines for all
  using (fn_is_admin((select organization_id from profit_distributions where id = profit_distribution_lines.distribution_id)))
  with check (fn_is_admin((select organization_id from profit_distributions where id = profit_distribution_lines.distribution_id)));

create policy attachments_select on attachments for select using (fn_is_org_member(organization_id));
create policy attachments_write on attachments for all
  using (fn_can_write(organization_id)) with check (fn_can_write(organization_id));

create policy audit_log_select on audit_log for select using (fn_is_org_member(organization_id));

-- ─────────────────────────────────────────────────────────────────────────
-- Seed default expense categories for a newly created organization
-- ─────────────────────────────────────────────────────────────────────────

create or replace function fn_seed_expense_categories(p_organization_id uuid) returns void as $$
begin
  insert into expense_categories (organization_id, name, icon) values
    (p_organization_id, 'Electricidad', 'zap'),
    (p_organization_id, 'Agua', 'droplet'),
    (p_organization_id, 'Internet', 'wifi'),
    (p_organization_id, 'Gas', 'flame'),
    (p_organization_id, 'Jardín', 'trees'),
    (p_organization_id, 'Piscina', 'waves'),
    (p_organization_id, 'Limpieza', 'sparkles'),
    (p_organization_id, 'Reparaciones', 'wrench'),
    (p_organization_id, 'Muebles', 'sofa'),
    (p_organization_id, 'Pintura', 'paintbrush'),
    (p_organization_id, 'Impuestos', 'landmark'),
    (p_organization_id, 'Comisiones plataforma', 'percent'),
    (p_organization_id, 'Productos de limpieza', 'spray-can'),
    (p_organization_id, 'Otros', 'more-horizontal')
  on conflict (organization_id, name) do nothing;
end;
$$ language plpgsql security definer set search_path = public;

-- ─────────────────────────────────────────────────────────────────────────
-- Onboarding: one call creates the organization, makes the caller its
-- admin, seeds expense categories, opens a default cash box, and
-- registers the family's first property.
-- ─────────────────────────────────────────────────────────────────────────

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

  insert into accounts (organization_id, type, name, opening_balance)
  values (v_org_id, 'caja', 'Caja General', 0);

  if p_property_name is not null and length(trim(p_property_name)) > 0 then
    insert into properties (organization_id, name) values (v_org_id, p_property_name);
  end if;

  return v_org_id;
end;
$$ language plpgsql security definer set search_path = public;
