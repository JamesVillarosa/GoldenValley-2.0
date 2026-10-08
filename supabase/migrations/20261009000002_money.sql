-- Per-customer price, walk-in sales, driver payouts and expenses.

-- null = use the station price from settings.
alter table customers add column price_per_gallon numeric check (price_per_gallon >= 0);

-- A walk-in sale has no customer and no driver (nobody earns commission on it).
alter table transactions
  alter column customer_id drop not null,
  alter column driver_id drop not null;

create table payouts (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references drivers(id) on delete restrict,
  period_from date not null,
  period_to date not null,
  amount numeric not null check (amount > 0),
  paid_at timestamptz not null default now()
);
create index payouts_driver_id_period_from_idx on payouts (driver_id, period_from);
alter table payouts enable row level security;

create table expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default manila_today(),
  category text not null,
  amount numeric not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);
create index expenses_spent_on_idx on expenses (spent_on);
alter table expenses enable row level security;

create or replace function dashboard_stats(p_from date, p_to date, p_unit text)
returns json language sql stable set search_path = public
as $$
  select json_build_object(
    'gallons', coalesce(sum(gallons), 0),
    'deliveries', count(*),
    'customers', count(distinct customer_id),
    'sales', coalesce(sum(gallons * unit_price), 0),
    'unpaid', coalesce(sum(gallons * unit_price) filter (where not paid), 0),
    'expenses', (select coalesce(sum(amount), 0) from expenses where spent_on between p_from and p_to),
    'balance_all', (select coalesce(sum(balance), 0) from customers),
    'containers_out', (select coalesce(sum(containers_out), 0) from customers),
    'by_driver', (
      select coalesce(json_agg(x order by x.gallons desc), '[]'::json) from (
        select coalesce(d.name, 'Walk-in') as name, sum(t.gallons) as gallons, count(*) as deliveries
        from transactions t left join drivers d on d.id = t.driver_id
        where t.delivered_on between p_from and p_to
        group by d.id, d.name
      ) x
    ),
    'series', (
      select coalesce(json_agg(x order by x.bucket), '[]'::json) from (
        select date_trunc(p_unit, delivered_on)::date as bucket, sum(gallons) as gallons
        from transactions
        where delivered_on between p_from and p_to
        group by 1
      ) x
    ),
    'top_customers', (
      select coalesce(json_agg(x order by x.gallons desc), '[]'::json) from (
        select c.id, c.name, sum(t.gallons) as gallons
        from transactions t join customers c on c.id = t.customer_id
        where t.delivered_on between p_from and p_to
        group by c.id, c.name
        order by 3 desc limit 5
      ) x
    )
  )
  from transactions
  where delivered_on between p_from and p_to;
$$;
