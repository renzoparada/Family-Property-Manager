-- Profiles were only ever created from the onboarding page's client-side
-- upsert, which runs when someone creates THEIR OWN organization. A user
-- who signs up only to be invited into an existing family never visits
-- onboarding, so no profile row existed for them — inviteMember() (which
-- looks up profiles by email) reported them as "not registered" even
-- though their auth.users row was there all along.
--
-- Create the profile automatically the moment a user signs up, so
-- inviting-by-email works regardless of whether they've ever onboarded.

create or replace function fn_handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function fn_handle_new_user();

-- Backfill anyone who already signed up before this trigger existed.
insert into public.profiles (id, email, full_name)
select id, email, raw_user_meta_data->>'full_name'
from auth.users
on conflict (id) do nothing;
