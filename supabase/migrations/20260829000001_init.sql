-- Golden Valley: core schema
-- All app access goes through Next.js Server Actions using the service role
-- key (server-only env var, never shipped to the browser). RLS is enabled on
-- every table with no permissive policies, so the anon/public key (if ever
-- exposed) can read or write nothing; the service role bypasses RLS by
-- design. There is no end-user auth in v1 (single owner/operator).

create extension if not exists pgcrypto;

create table drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_salary numeric not null default 0,
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  driver_id uuid not null references drivers(id) on delete restrict,
  manual_interval_days int,
  -- cached fields, recomputed by recompute_customer_schedule() below
  computed_interval_days int,
  last_transaction_at timestamptz,
  expected_next_date date,
  status text check (status in ('new', 'on_schedule', 'due_soon', 'overdue')) not null default 'new',
  created_at timestamptz not null default now()
);

create index customers_driver_id_idx on customers (driver_id);
create index customers_status_idx on customers (status);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  driver_id uuid not null references drivers(id) on delete restrict,
  gallons numeric not null check (gallons > 0),
  created_at timestamptz not null default now()
);

create index transactions_customer_id_created_at_idx on transactions (customer_id, created_at);
create index transactions_driver_id_created_at_idx on transactions (driver_id, created_at);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table drivers enable row level security;
alter table customers enable row level security;
alter table transactions enable row level security;
alter table push_subscriptions enable row level security;

-- Frequency algorithm -------------------------------------------------------
-- manual_interval_days overrides everything. Otherwise: fewer than 2
-- transactions -> 14-day fallback. Otherwise: median of the gaps (in days)
-- between consecutive transactions, ordered by created_at. Median (not mean)
-- so one rush order or one skipped week doesn't swing the whole cadence.

create or replace function calculate_customer_interval(p_customer_id uuid)
returns int
language plpgsql
stable
as $$
declare
  v_manual int;
  v_interval numeric;
begin
  select manual_interval_days into v_manual from customers where id = p_customer_id;
  if v_manual is not null then
    return v_manual;
  end if;

  with ordered as (
    select created_at,
           created_at - lag(created_at) over (order by created_at) as gap
    from transactions
    where customer_id = p_customer_id
  )
  select percentile_cont(0.5) within group (order by extract(epoch from gap) / 86400.0)
  into v_interval
  from ordered
  where gap is not null;

  if v_interval is null then
    return 14;
  end if;

  return greatest(1, round(v_interval)::int);
end;
$$;

create or replace function recompute_customer_schedule(p_customer_id uuid)
returns void
language plpgsql
as $$
declare
  v_interval int;
  v_last timestamptz;
  v_expected date;
  v_days_until numeric;
  v_status text;
begin
  select max(created_at) into v_last from transactions where customer_id = p_customer_id;
  v_interval := calculate_customer_interval(p_customer_id);

  if v_last is null then
    v_status := 'new';
    update customers
    set computed_interval_days = v_interval,
        last_transaction_at = null,
        expected_next_date = null,
        status = v_status
    where id = p_customer_id;
    return;
  end if;

  v_expected := (v_last + make_interval(days => v_interval))::date;
  v_days_until := v_expected - current_date;

  v_status := case
    when v_days_until > 2 then 'on_schedule'
    when v_days_until >= 0 then 'due_soon'
    else 'overdue'
  end;

  update customers
  set computed_interval_days = v_interval,
      last_transaction_at = v_last,
      expected_next_date = v_expected,
      status = v_status
  where id = p_customer_id;
end;
$$;

create or replace function recompute_all_customer_schedules()
returns void
language plpgsql
as $$
declare
  r record;
begin
  for r in select id from customers loop
    perform recompute_customer_schedule(r.id);
  end loop;
end;
$$;

-- Keep a customer's schedule fresh the moment a transaction changes, so the
-- transaction-entry screen's droplet status is never stale mid-session.
create or replace function trg_recompute_on_transaction()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform recompute_customer_schedule(old.customer_id);
    return old;
  end if;
  perform recompute_customer_schedule(new.customer_id);
  return new;
end;
$$;

create trigger transactions_recompute
after insert or update or delete on transactions
for each row execute function trg_recompute_on_transaction();

create or replace function trg_recompute_on_customer_override()
returns trigger
language plpgsql
as $$
begin
  if new.manual_interval_days is distinct from old.manual_interval_days then
    perform recompute_customer_schedule(new.id);
  end if;
  return new;
end;
$$;

create trigger customers_recompute_on_override
after update on customers
for each row execute function trg_recompute_on_customer_override();

-- Seed the two drivers.
insert into drivers (name, base_salary) values
  ('Driver 1', 0),
  ('Driver 2', 0);
