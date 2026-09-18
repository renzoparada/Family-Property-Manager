-- Reservations only ever tracked one lump amount (paid in full, or not at
-- all, when status flips to 'pagado'). Real bookings are usually two
-- payments: a deposit/seña taken to hold the date, and the remaining
-- balance paid later (often at check-in). Adds deposit_amount so both
-- moments are tracked and posted to Caja y bancos as they actually
-- happen, instead of only once the whole thing is marked paid.

alter table reservations add column if not exists deposit_amount numeric(14,2) not null default 0;

alter table reservations add column if not exists balance_amount numeric(14,2)
  generated always as (gross_amount - commission_amount - deposit_amount) stored;
