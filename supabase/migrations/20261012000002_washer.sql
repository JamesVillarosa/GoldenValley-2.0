-- A washer is paid like a driver but delivers nothing: a fixed amount for every
-- working day (Monday to Saturday) since they were added, plus, if the manager
-- sets them, a rate per gallon and bonus targets counted on everything the
-- station sold that day.
alter table drivers add column role text not null default 'driver' check (role in ('driver', 'washer'));

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
    union all
    select w.id, g.day::date,
           coalesce((select sum(t.gallons) from transactions t where t.delivered_on = g.day::date), 0),
           0
    from drivers w
    cross join lateral generate_series(
      greatest(p_from, (w.created_at at time zone 'Asia/Manila')::date)::timestamp,
      least(p_to, manila_today())::timestamp,
      interval '1 day'
    ) as g(day)
    where w.role = 'washer' and w.active and extract(dow from g.day) <> 0
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
  select coalesce(json_agg(x order by x.role, x.name), '[]'::json) from (
    select d.id, d.name, d.role, d.base_salary, d.rate_per_gallon, d.bonuses,
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
