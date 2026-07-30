-- Fixes fn_audit_log(), which referenced old.organization_id/new.organization_id
-- directly. That field doesn't exist on `environments` or `loan_payments`
-- (they only carry property_id / loan_id), so any insert/update/delete on
-- those two tables failed with: record "old" has no field "organization_id".
--
-- Rewritten to resolve organization_id via jsonb (safe when the column is
-- absent) and, for environments/loan_payments specifically, via their
-- parent row so audit_log still records the correct organization.

create or replace function fn_audit_log() returns trigger as $$
declare
  v_org uuid;
  v_new jsonb := to_jsonb(new);
  v_old jsonb := to_jsonb(old);
  v_record_id uuid := coalesce((to_jsonb(new)->>'id')::uuid, (to_jsonb(old)->>'id')::uuid);
begin
  v_org := coalesce(
    (case when TG_OP = 'DELETE' then v_old->>'organization_id' else v_new->>'organization_id' end)::uuid,
    case TG_TABLE_NAME
      when 'environments' then (
        select organization_id from properties
        where id = coalesce((v_new->>'property_id')::uuid, (v_old->>'property_id')::uuid)
      )
      when 'loan_payments' then (
        select organization_id from loans
        where id = coalesce((v_new->>'loan_id')::uuid, (v_old->>'loan_id')::uuid)
      )
      else null
    end
  );

  insert into audit_log (organization_id, table_name, record_id, action, user_id, old_data, new_data)
  values (
    v_org,
    TG_TABLE_NAME,
    v_record_id,
    lower(TG_OP)::audit_action,
    auth.uid(),
    case when TG_OP in ('UPDATE','DELETE') then v_old else null end,
    case when TG_OP in ('UPDATE','INSERT') then v_new else null end
  );
  return coalesce(new, old);
end;
$$ language plpgsql security definer set search_path = public;
