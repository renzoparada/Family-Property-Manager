-- Tracks each member's last login so the Miembros page can show "última
-- actividad" without building real-time presence. auth.users already
-- keeps last_sign_in_at up to date on every sign-in; we mirror it onto
-- profiles (which the app can query normally) via a trigger.

alter table profiles add column if not exists last_seen_at timestamptz;

create or replace function fn_sync_last_seen() returns trigger as $$
begin
  update profiles set last_seen_at = new.last_sign_in_at where id = new.id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_sync_last_seen on auth.users;
create trigger trg_sync_last_seen
  after update on auth.users
  for each row
  when (old.last_sign_in_at is distinct from new.last_sign_in_at)
  execute function fn_sync_last_seen();

-- Backfill from whatever auth.users already has.
update profiles p
set last_seen_at = au.last_sign_in_at
from auth.users au
where au.id = p.id and au.last_sign_in_at is not null;
