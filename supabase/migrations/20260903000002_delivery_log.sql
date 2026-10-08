-- Permanent archive of each day's deliveries. The `transactions` table is
-- reset daily (driver salary is per-day, gallons computed from the day's
-- transactions), so this table preserves the customer/gallons record before
-- rows are deleted. Denormalized (customer_name, driver_name) so the record
-- stays intact even if the source row is later renamed or removed.

create table delivery_log (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null,
  customer_id uuid not null,
  customer_name text not null,
  driver_id uuid not null,
  driver_name text not null,
  gallons numeric not null,
  delivered_at timestamptz not null,
  logged_at timestamptz not null default now()
);

create index delivery_log_driver_id_delivered_at_idx on delivery_log (driver_id, delivered_at);
create index delivery_log_customer_id_delivered_at_idx on delivery_log (customer_id, delivered_at);

alter table delivery_log enable row level security;
