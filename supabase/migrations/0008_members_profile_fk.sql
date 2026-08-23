-- Every page that lists organization members (Miembros, Gastos "quién
-- pagó", Inversiones, Préstamos, Reportes) embeds the member's profile
-- with `select("*, profile:profiles(*)")` on `organization_members`.
-- PostgREST can only resolve that embed if it can find a foreign key
-- path between the two tables. `organization_members.user_id` and
-- `profiles.id` both reference `auth.users(id)` independently, but
-- there is no FK directly between `organization_members` and
-- `profiles` — so PostgREST returns a "Could not find a relationship"
-- error on every one of those queries. The pages all discard the error
-- (`data ?? []`), so the symptom was a silently empty member list
-- rather than a visible error, e.g. the empty Miembros table.
--
-- Every `organization_members.user_id` is guaranteed to already have a
-- matching `profiles` row (migration 0004's signup trigger + backfill),
-- so adding a second FK constraint on the same column, this time
-- pointing at `profiles(id)`, is safe and gives PostgREST the
-- relationship path it needs.

alter table organization_members
  add constraint organization_members_user_id_profiles_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

-- Make PostgREST pick up the new relationship immediately instead of
-- waiting for its next periodic schema-cache reload.
notify pgrst, 'reload schema';
