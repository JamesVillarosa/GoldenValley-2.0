-- Who paid an expense: a driver, out of the cash collected that day (deducted
-- from what the driver remits), or the manager (null).
alter table expenses add column driver_id uuid references drivers(id) on delete set null;
create index expenses_driver_id_spent_on_idx on expenses (driver_id, spent_on);

-- A bale is salary handed over early. It is a payout, not a business expense:
-- it lowers what the driver is still owed and never touches the dashboard.
alter table payouts add column kind text not null default 'salary' check (kind in ('salary', 'advance'));

-- What a driver is still owed as of a date: everything earned up to that date
-- minus everything ever paid (salary and bale). Payments always settle the
-- oldest earnings first, so no screen can ask to pay the same day twice, and a
-- bale larger than one day's pay simply carries into the next days.
create or replace function driver_owed(p_as_of date)
returns table (driver_id uuid, earned numeric, paid numeric, owed numeric)
language sql stable set search_path = public
as $$
  select d.id, coalesce(e.earned, 0), coalesce(p.paid, 0), coalesce(e.earned, 0) - coalesce(p.paid, 0)
  from drivers d
  left join (
    select x.driver_id, sum(x.pay) as earned from driver_day_pay('2000-01-01', p_as_of) x group by x.driver_id
  ) e on e.driver_id = d.id
  left join (
    select o.driver_id, sum(o.amount) as paid from payouts o group by o.driver_id
  ) p on p.driver_id = d.id;
$$;

-- Pays the driver everything still owed as of the date. The lock makes a
-- double tap pay once.
create or replace function pay_driver(p_driver uuid, p_as_of date)
returns numeric language plpgsql set search_path = public
as $$
declare
  v_owed numeric;
begin
  perform pg_advisory_xact_lock(hashtext(p_driver::text));
  select o.owed into v_owed from driver_owed(p_as_of) o where o.driver_id = p_driver;
  if coalesce(v_owed, 0) <= 0 then
    return 0;
  end if;
  insert into payouts (driver_id, period_from, period_to, amount) values (p_driver, p_as_of, p_as_of, v_owed);
  return v_owed;
end;
$$;

drop function if exists record_payout(uuid, date, date);
