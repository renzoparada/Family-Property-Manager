-- inviteMember() looks up a profile by email before adding someone to the
-- organization — but profiles' own RLS policy only lets you see your own
-- profile, or someone who ALREADY shares an organization with you. Since
-- the whole point of this lookup is to find someone who does NOT share an
-- org with you yet, RLS silently returned nothing and the invite flow
-- reported every real user as "not registered".
--
-- A narrow security-definer function sidesteps that: it only ever returns
-- a bare user id for a given email, never any other profile data, so it
-- can't be used to enumerate/leak profile details — just enough for the
-- invite flow to resolve who to add.

create or replace function fn_find_user_id_by_email(p_email text) returns uuid as $$
  select id from profiles where email = p_email;
$$ language sql stable security definer set search_path = public;
