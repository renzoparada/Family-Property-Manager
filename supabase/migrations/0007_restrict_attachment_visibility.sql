-- Attachments (facturas, comprobantes, fotos) were visible to any
-- organization member, including 'contador' and 'invitado'. Restrict
-- viewing to 'admin' and 'socio' only — writing (upload) still follows
-- fn_can_write (admin/socio/contador), this only narrows who can SEE them.

create or replace function fn_is_admin_or_socio(p_organization_id uuid) returns boolean as $$
  select exists (
    select 1 from organization_members
    where organization_id = p_organization_id
      and user_id = auth.uid()
      and role in ('admin', 'socio')
  );
$$ language sql stable security definer set search_path = public;

drop policy if exists attachments_select on attachments;
create policy attachments_select on attachments for select
  using (fn_is_admin_or_socio(organization_id));

drop policy if exists attachments_storage_select on storage.objects;
create policy attachments_storage_select on storage.objects for select
  using (
    bucket_id = 'attachments'
    and fn_is_admin_or_socio((storage.foldername(name))[1]::uuid)
  );
