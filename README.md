# Golden Valley

[![CI](https://github.com/JamesVillarosa/GoldenValley-2.0/actions/workflows/ci.yml/badge.svg)](https://github.com/JamesVillarosa/GoldenValley-2.0/actions/workflows/ci.yml)

Daily operations for a real water refilling and delivery station in the Philippines. The owner logs every sale on a phone, and the app works out who is due for water next, what each customer owes, and what each driver and washer has earned. It replaced a paper log and is used every working day.

Live: https://golden-valley-theta.vercel.app (PIN protected)

## What it does

- **Deliver**: log a delivery or a walk-in sale in a few taps. Customer deals ("50 for 3 gallons") are priced automatically, backdated entries keep their order, and Sundays (closed) are refused.
- **Due list**: each customer's ordering rhythm is learned from their delivery history, so the owner knows who to call today. The owner can override it per customer.
- **Salary**: base pay + commission per gallon + bonus tiers per day, for drivers and washers. Advances (bale) lower what is still owed, and paying twice in a row pays nothing extra.
- **Dashboard**: sales, expenses and gallons by day, week, month or year.
- **Push reminders**: a daily Vercel Cron job recomputes every schedule and sends a Web Push to the owner's phone with who is due.

## Stack

Next.js 16 (App Router, Server Actions) as an installable PWA, Supabase Postgres, Tailwind CSS 4, Vercel (hosting and Cron), Web Push.

```
phone (PWA)  ──Server Actions──▶  Next.js on Vercel  ──service role──▶  Supabase Postgres
                                   │  proxy.ts: PIN session check         RLS on, no public policies
                                   │  db(): session checked again         schedule + pay logic in SQL
Vercel Cron ──Bearer CRON_SECRET──▶ /api/cron/notify ──▶ Web Push
```

## Design decisions

- **Business rules live in Postgres.** The delivery schedule (`recompute_customer_schedule`, run by a trigger on every sale) and pay (`driver_day_pay`) are SQL functions. The salary screen and the payouts read the same function, so they cannot disagree.
- **Median, not mean.** A customer's interval is the median gap between their last 9 delivery days, so one rush order or one skipped week does not move it.
- **Manila time everywhere.** Vercel runs in UTC. `delivered_on` is a generated column in Asia/Manila time, and the app uses `manilaToday()`, so a sale at 7am Manila is never filed under yesterday.
- **Prices are copied onto each sale**, so changing a price never rewrites history.
- **No browser access to the database.** RLS is on with no public policies. Only the server holds the service role key, and Server Actions check the PIN session themselves because they are public HTTP endpoints.
- **Error messages survive production.** Next.js strips messages from errors thrown in Server Actions, so actions are wrapped in `safe()` and return them as data.

## Tests

```bash
npm test          # Vitest: 40 tests
npm run typecheck
npm run lint
```

- `tests/db.test.ts` runs **every migration in order on an in-memory Postgres (PGlite)**, then tests the real SQL: schedule learning, Sunday handling, due/overdue status, unpaid balance, the pay formula, washer pay and double-tap-safe payouts.
- `tests/*.test.ts` cover Manila dates and workdays, deal pricing, the session token and proxy redirects, Server Action input validation, and the cron route's auth.
- CI runs lint, typecheck and tests on every push.

Not yet covered: UI and end-to-end tests (Playwright is the next step) and the Web Push sender.

## Run locally

```bash
npm install
supabase start            # local Postgres; applies supabase/migrations
cp .env.local.example .env.local   # fill in the service role key from `supabase start`
npm run dev
```

The first PIN you enter becomes the owner's PIN.
