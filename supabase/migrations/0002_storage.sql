-- Private storage bucket for photos, invoices, receipts, PDFs.
-- Objects are keyed as: <organization_id>/<entity_type>/<entity_id>/<filename>
-- so RLS can scope access using the same organization membership check.

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy attachments_storage_select on storage.objects for select
  using (
    bucket_id = 'attachments'
    and fn_is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy attachments_storage_insert on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and fn_can_write((storage.foldername(name))[1]::uuid)
  );

create policy attachments_storage_delete on storage.objects for delete
  using (
    bucket_id = 'attachments'
    and fn_can_write((storage.foldername(name))[1]::uuid)
  );
