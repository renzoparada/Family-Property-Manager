-- iCal calendar sync (Airbnb / Booking.com).
--
-- Neither platform grants API access to individual hosts — only to
-- certified channel-manager partners — but both let a host export a
-- per-listing .ics calendar feed of blocked/booked date ranges. That
-- feed is the only integration route available without paying for a
-- third-party channel manager, so this is what "conectar Airbnb/Booking"
-- means in this app: read-only calendar polling, not a live booking API.
--
-- Trade-off worth remembering: the feed carries dates only. Airbnb/Booking
-- strip guest name and price for privacy, so an imported reservation lands
-- as 'pendiente' with a placeholder guest name — the host still fills in
-- who it was and what it was worth.

create table ical_feeds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  environment_id uuid references environments(id) on delete set null,
  platform reservation_platform not null default 'airbnb',
  url text not null,
  last_synced_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index on ical_feeds (organization_id);
create index on ical_feeds (property_id);

alter table ical_feeds enable row level security;

create policy ical_feeds_select on ical_feeds for select
  using (fn_is_org_member(organization_id));
create policy ical_feeds_write on ical_feeds for all
  using (fn_can_write(organization_id)) with check (fn_can_write(organization_id));

create trigger trg_audit_ical_feeds after insert or update or delete on ical_feeds
  for each row execute function fn_audit_log();

-- Reservations imported from a feed carry the feed's own event UID, so
-- re-syncing updates/dedupes instead of creating duplicates, and a UID
-- that disappears from a later fetch (the guest cancelled) can be
-- detected and reflected instead of left stale.
alter table reservations add column if not exists ical_feed_id uuid references ical_feeds(id) on delete set null;
alter table reservations add column if not exists external_uid text;

create unique index if not exists reservations_ical_feed_external_uid_key
  on reservations (ical_feed_id, external_uid)
  where ical_feed_id is not null;
