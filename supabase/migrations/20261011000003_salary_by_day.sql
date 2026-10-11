-- Salary is worked out in one place, one driver-day at a time:
--   pay = base salary + commission per gallon x gallons + every bonus target reached that day
-- The report and the payouts both read this function, so they can never disagree.
create or replace function driver_day_pay(p_from date, p_to date)
returns table (driver_id uuid, day date, gallons numeric, deliveries bigint,
               base numeric, commission numeric, bonus numeric, pay numeric)
language sql stable set search_path = public
as $$
  select d.id, x.day, x.gallons, x.deliveries,
         d.base_salary,
         round(d.rate_per_gallon * x.gallons, 2),
         b.bonus,
         round(d.base_salary + d.rate_per_gallon * x.gallons + b.bonus, 2)
  from drivers d
  join (
    select t.driver_id, t.delivered_on as day, sum(t.gallons) as gallons, count(*) as deliveries
    from transactions t
    where t.driver_id is not null and t.delivered_on between p_from and p_to
    group by t.driver_id, t.delivered_on
  ) x on x.driver_id = d.id
  cross join lateral (
    select coalesce(sum((e->>'amount')::numeric), 0) as bonus
    from jsonb_array_elements(d.bonuses) e
    where x.gallons >= (e->>'gallons')::numeric
  ) b;
$$;

create or replace function salary_report(p_from date, p_to date)
returns json language sql stable set search_path = public
as $$
  select coalesce(json_agg(x order by x.name), '[]'::json) from (
    select d.id, d.name, d.base_salary, d.rate_per_gallon, d.bonuses,
      coalesce(sum(p.gallons), 0) as gallons,
      coalesce(sum(p.deliveries), 0) as deliveries,
      count(p.day) as days_worked,
      coalesce(sum(p.base), 0) as base_pay,
      coalesce(sum(p.commission), 0) as commission_pay,
      coalesce(sum(p.bonus), 0) as bonus,
      coalesce(sum(p.pay), 0) as total,
      (
        select coalesce(json_agg(c order by c.gallons desc), '[]'::json) from (
          select cu.name, sum(t2.gallons) as gallons
          from transactions t2 join customers cu on cu.id = t2.customer_id
          where t2.driver_id = d.id and t2.delivered_on between p_from and p_to
          group by cu.id, cu.name
        ) c
      ) as customers
    from drivers d
    left join driver_day_pay(p_from, p_to) p on p.driver_id = d.id
    where d.active
    group by d.id
  ) x;
$$;

-- Pays a driver for a period as one payout row per day worked, each for what
-- is still owed on that day. Day rows add up exactly in the day, week and
-- month views, and a second tap finds nothing left to pay.
create or replace function record_payout(p_driver uuid, p_from date, p_to date)
returns numeric language plpgsql set search_path = public
as $$
declare
  v_total numeric;
begin
  perform pg_advisory_xact_lock(hashtext(p_driver::text));

  with added as (
    insert into payouts (driver_id, period_from, period_to, amount)
    select p.driver_id, p.day, p.day, p.pay - coalesce(paid.amount, 0)
    from driver_day_pay(p_from, p_to) p
    left join lateral (
      select sum(o.amount) as amount from payouts o
      where o.driver_id = p.driver_id and o.period_from <= p.day and o.period_to >= p.day
    ) paid on true
    where p.driver_id = p_driver and p.pay - coalesce(paid.amount, 0) > 0
    returning amount
  )
  select coalesce(sum(amount), 0) into v_total from added;
  return v_total;
end;
$$;
