-- Tareas: tablero tipo Kanban (Pendientes / En proceso / En OBS /
-- Finalizados) para seguimiento operativo — no mueve dinero, es gestión
-- de trabajo, igual de independiente de Gastos/Ingresos que Necesidades.
-- property_id es opcional porque una tarea puede ser general de la
-- organización (ej. "renovar seguro") y no de una propiedad puntual.

create type task_status as enum ('pendiente', 'en_proceso', 'en_obs', 'finalizado');
create type task_priority as enum ('alta', 'media', 'baja');

create table tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  title text not null,
  description text,
  status task_status not null default 'pendiente',
  priority task_priority not null default 'media',
  assigned_to uuid references auth.users(id) on delete set null,
  due_date date,
  position integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on tasks (organization_id);
create index on tasks (property_id);
create index on tasks (status);

create trigger trg_tasks_updated_at before update on tasks
  for each row execute function fn_set_updated_at();

alter table tasks enable row level security;

create policy tasks_select on tasks for select using (fn_is_org_member(organization_id));
create policy tasks_write on tasks for all
  using (fn_can_write(organization_id)) with check (fn_can_write(organization_id));

create trigger trg_audit_tasks after insert or update or delete on tasks
  for each row execute function fn_audit_log();
