-- Operations upgrade: customer contact details, payments, borrowed containers,
-- business-day dates in Manila time, data-driven frequency, and the SQL
-- aggregates behind the dashboard and salary screens.

alter table drivers add column active boolean not null default true;

alter table customers
  add column phone text,
  add column address text,
  add column containers_out int not null default 0 check (containers_out >= 0),
  add column usual_gallons numeric,
  add column balance numeric not null default 0;

-- delivered_on is the business day in Manila time, derived from created_at.
-- Every "today", salary and dashboard query keys on it, so nothing depends on
-- the server's UTC clock.
alter table transactions
  add column delivered_on date generated always as ((created_at at time zone 'Asia/Manila')::date) stored,
  add column unit_price numeric not null default 0 check (unit_price >= 0),
  add column paid boolean not null default true;

create index transactions_delivered_on_idx on transactions (delivered_on);
create index transactions_driver_id_delivered_on_idx on transactions (driver_id, delivered_on);
create index customers_expected_next_date_idx on customers (expected_next_date);

create table settings (
  id boolean primary key default true check (id),
  price_per_gallon numeric not null default 0 check (price_per_gallon >= 0),
  pin_hash text,
  pin_fails int not null default 0,
  pin_locked_until timestamptz
);
insert into settings default values;
alter table settings enable row level security;

create or replace function manila_today()
returns date language sql stable set search_path = public
as $$ select (now() at time zone 'Asia/Manila')::date $$;

-- Frequency: median gap in days between the customer's most recent delivery
-- days. Recent days only, so a customer who changes habit is re-learned within
-- a few orders. Median, so one rush order or one skipped week does not swing
-- it. One delivery or none: assume weekly.
create or replace function calculate_customer_interval(p_customer_id uuid)
returns int language plpgsql stable set search_path = public
as $$
declare
  v_manual int;
  v_interval numeric;
begin
  select manual_interval_days into v_manual from customers where id = p_customer_id;
  if v_manual is not null then
    return v_manual;
  end if;

  with days as (
    select distinct delivered_on as d from transactions
    where customer_id = p_customer_id
    order by d desc limit 9
  ), gaps as (
    select d - lag(d) over (order by d) as gap from days
  )
  select percentile_cont(0.5) within group (order by gap)
  into v_interval from gaps where gap is not null;

  return greatest(1, round(coalesce(v_interval, 7))::int);
end;
$$;

create or replace function recompute_customer_schedule(p_customer_id uuid)
returns void language plpgsql set search_path = public
as $$
declare
  v_interval int := calculate_customer_interval(p_customer_id);
  v_last_at timestamptz;
  v_last date;
  v_balance numeric;
  v_usual numeric;
  v_expected date;
  v_days int;
begin
  select max(created_at), max(delivered_on),
         coalesce(sum(gallons * unit_price) filter (where not paid), 0)
  into v_last_at, v_last, v_balance
  from transactions where customer_id = p_customer_id;

  select round(avg(g)) into v_usual from (
    select sum(gallons) as g from transactions
    where customer_id = p_customer_id
    group by delivered_on order by delivered_on desc limit 5
  ) recent;

  v_expected := v_last + v_interval;
  v_days := v_expected - manila_today();

  update customers
  set computed_interval_days = v_interval,
      last_transaction_at = v_last_at,
      expected_next_date = v_expected,
      usual_gallons = v_usual,
      balance = v_balance,
      status = case
        when v_last is null then 'new'
        when v_days > 1 then 'on_schedule'
        when v_days >= 0 then 'due_soon'
        else 'overdue'
      end
  where id = p_customer_id;
end;
$$;

select recompute_all_customer_schedules();

create or replace function dashboard_stats(p_from date, p_to date, p_unit text)
returns json language sql stable set search_path = public
as $$
  select json_build_object(
    'gallons', coalesce(sum(gallons), 0),
    'deliveries', count(*),
    'customers', count(distinct customer_id),
    'sales', coalesce(sum(gallons * unit_price), 0),
    'unpaid', coalesce(sum(gallons * unit_price) filter (where not paid), 0),
    'balance_all', (select coalesce(sum(balance), 0) from customers),
    'containers_out', (select coalesce(sum(containers_out), 0) from customers),
    'by_driver', (
      select coalesce(json_agg(x order by x.gallons desc), '[]'::json) from (
        select d.name, sum(t.gallons) as gallons, count(*) as deliveries
        from transactions t join drivers d on d.id = t.driver_id
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

create or replace function salary_report(p_from date, p_to date)
returns json language sql stable set search_path = public
as $$
  select coalesce(json_agg(x order by x.name), '[]'::json) from (
    select d.id, d.name, d.base_salary, d.rate_per_gallon,
      coalesce(sum(t.gallons), 0) as gallons,
      count(t.id) as deliveries,
      count(distinct t.delivered_on) as days_worked,
      (
        select coalesce(json_agg(c order by c.gallons desc), '[]'::json) from (
          select cu.name, sum(t2.gallons) as gallons
          from transactions t2 join customers cu on cu.id = t2.customer_id
          where t2.driver_id = d.id and t2.delivered_on between p_from and p_to
          group by cu.id, cu.name
        ) c
      ) as customers
    from drivers d
    left join transactions t
      on t.driver_id = d.id and t.delivered_on between p_from and p_to
    where d.active
    group by d.id
  ) x;
$$;
