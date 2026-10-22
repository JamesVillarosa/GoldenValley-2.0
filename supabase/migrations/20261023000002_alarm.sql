-- Daily alarms, Monday to Saturday, Manila time (same rule as src/lib/alarm.ts):
--   lunch:   from 1:00 pm while no sale is logged for today;
--   evening: from 6:30 pm until the manager taps "Paid and unpaid checked".
create table alarm_checks (
  day date primary key,
  checked_at timestamptz not null default now()
);
alter table alarm_checks enable row level security;

create or replace function alarm_due(p_now timestamptz default now())
returns text language sql stable set search_path = public
as $$
  select case
    when extract(dow from (p_now at time zone 'Asia/Manila')::date) = 0 then null
    when (p_now at time zone 'Asia/Manila')::time >= '13:00'
         and not exists (select 1 from transactions where delivered_on = (p_now at time zone 'Asia/Manila')::date) then 'lunch'
    when (p_now at time zone 'Asia/Manila')::time >= '18:30'
         and not exists (select 1 from alarm_checks where day = (p_now at time zone 'Asia/Manila')::date) then 'evening'
  end
$$;

-- Every 2 seconds, and only while an alarm is due, ask the app to push it to
-- every phone. The secret lives in Supabase Vault, never in this file.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule(
  'gv-alarm',
  '2 seconds',
  $job$
    select net.http_post(
      url := 'https://golden-valley-theta.vercel.app/api/cron/alarm',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'alarm_secret')
      ),
      body := '{}'::jsonb
    )
    where public.alarm_due() is not null
  $job$
);
