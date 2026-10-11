-- Places, bundle prices, driver bonuses, monthly bills, Sunday closure and
-- customer deletion.

alter table customers
  add column area text,
  -- "50 pesos for 3 gallons": price_per_gallon stays the true per-gallon price
  -- (50/3) and price_qty remembers the 3 so the form can show the deal back.
  add column price_qty int not null default 1 check (price_qty > 0);
create index customers_area_idx on customers (area);

-- [{"gallons": 100, "amount": 25}, ...]: every tier a driver reaches in a day
-- adds its amount to that day's pay.
alter table drivers add column bonuses jsonb not null default '[]';

-- A monthly bill (electricity) counts in the month and year reports only.
alter table expenses add column monthly boolean not null default false;

-- Deleting a customer keeps their sales, so past salary and sales reports do
-- not change.
alter table transactions drop constraint transactions_customer_id_fkey;
alter table transactions
  add constraint transactions_customer_id_fkey
  foreign key (customer_id) references customers(id) on delete set null;

-- The station is closed on Sundays: an order expected on a Sunday moves to Monday.
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
  if extract(dow from v_expected) = 0 then
    v_expected := v_expected + 1;
  end if;
  v_days := v_expected - manila_today();

  update customers
  set computed_interval_days = v_interval,
      last_transaction_at = v_last_at,
      expected_next_date = v_expected,
      usual_gallons = v_usual,
      balance = round(v_balance, 2),
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

create or replace function salary_report(p_from date, p_to date)
returns json language sql stable set search_path = public
as $$
  select coalesce(json_agg(x order by x.name), '[]'::json) from (
    select d.id, d.name, d.base_salary, d.rate_per_gallon, d.bonuses,
      coalesce(sum(t.gallons), 0) as gallons,
      count(t.id) as deliveries,
      count(distinct t.delivered_on) as days_worked,
      (
        select coalesce(sum((b->>'amount')::numeric), 0) from (
          select sum(t3.gallons) as g from transactions t3
          where t3.driver_id = d.id and t3.delivered_on between p_from and p_to
          group by t3.delivered_on
        ) day
        cross join jsonb_array_elements(d.bonuses) b
        where day.g >= (b->>'gallons')::numeric
      ) as bonus,
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

create or replace function dashboard_stats(p_from date, p_to date, p_unit text)
returns json language sql stable set search_path = public
as $$
  select json_build_object(
    'gallons', coalesce(sum(gallons), 0),
    'deliveries', count(*),
    'customers', count(distinct customer_id),
    'sales', coalesce(round(sum(gallons * unit_price), 2), 0),
    'unpaid', coalesce(round(sum(gallons * unit_price) filter (where not paid), 2), 0),
    'expenses', (
      select coalesce(sum(amount), 0) from expenses
      where spent_on between p_from and p_to and (not monthly or p_to - p_from >= 27)
    ),
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
