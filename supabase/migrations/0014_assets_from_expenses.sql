-- A Gasto can also be a fixed-asset purchase (tools, furniture, equipment)
-- — lets a specific expense be converted into an Activo fijo the same way
-- a purchased Necesidad already can, so it isn't entered twice. A unique
-- partial index (same pattern as source_need_id) stops the same expense
-- from being converted more than once.

alter table assets add column if not exists source_expense_id uuid references expenses(id) on delete set null;

create unique index if not exists assets_source_expense_id_key on assets (source_expense_id)
  where source_expense_id is not null;
