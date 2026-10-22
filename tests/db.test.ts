import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

// Every migration runs, in order, on an in-memory Postgres: the schedule and
// pay logic is tested exactly as it ships.
const dir = "supabase/migrations";
let pg: PGlite;

beforeAll(async () => {
  pg = await PGlite.create({ extensions: { pgcrypto } });
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await pg.exec(readFileSync(`${dir}/${file}`, "utf8"));
  }
  // Freeze "today" in Manila so results do not depend on when the test runs.
  await pg.exec(`create or replace function manila_today() returns date language sql stable as $$ select date '2026-10-23' $$`);
});

beforeEach(async () => {
  await pg.exec("truncate transactions, payouts, expenses, customers, drivers cascade");
});

const one = async <T>(sql: string, params: unknown[] = []) => (await pg.query<T>(sql, params)).rows[0];
const driver = (base = 0, rate = 0, bonuses = "[]", role = "driver") =>
  one<{ id: string }>(
    "insert into drivers (name, base_salary, rate_per_gallon, bonuses, role, created_at) values ('D', $1, $2, $3, $4, '2026-10-19T00:00+08') returning id",
    [base, rate, bonuses, role]
  ).then((r) => r!.id);
const customer = (driverId: string) =>
  one<{ id: string }>("insert into customers (name, driver_id) values ('C', $1) returning id", [driverId]).then((r) => r!.id);
const sell = (customerId: string | null, driverId: string | null, gallons: number, day: string, paid = true, unit = 20) =>
  pg.query("insert into transactions (customer_id, driver_id, gallons, unit_price, paid, created_at) values ($1, $2, $3, $4, $5, $6)", [
    customerId, driverId, gallons, unit, paid, `${day}T09:00+08`,
  ]);
const schedule = (id: string) =>
  one<{ computed_interval_days: number; expected_next_date: Date; status: string; balance: string }>(
    "select computed_interval_days, expected_next_date, status, balance from customers where id = $1", [id]
  );
const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("delivery schedule", () => {
  it("starts new, then assumes weekly after one delivery", async () => {
    const c = await customer(await driver());
    expect((await schedule(c))!.status).toBe("new");
    await sell(c, null, 2, "2026-10-21");
    const s = (await schedule(c))!;
    expect(s.computed_interval_days).toBe(7);
    expect(iso(s.expected_next_date)).toBe("2026-10-28");
    expect(s.status).toBe("on_schedule");
  });

  it("learns the median gap, so one rush order does not swing it", async () => {
    const d = await driver();
    const c = await customer(d);
    for (const day of ["2026-09-28", "2026-10-01", "2026-10-05", "2026-10-06", "2026-10-09", "2026-10-12"]) await sell(c, d, 3, day);
    // gaps 3, 4, 1, 3, 3: median 3
    const s = (await schedule(c))!;
    expect(s.computed_interval_days).toBe(3);
    expect(iso(s.expected_next_date)).toBe("2026-10-15");
    expect(s.status).toBe("overdue");
  });

  it("moves an order expected on Sunday to Monday", async () => {
    const d = await driver();
    const c = await customer(d);
    await sell(c, d, 3, "2026-10-17");
    await sell(c, d, 3, "2026-10-21"); // gap 4, next = Sunday the 25th
    const s = (await schedule(c))!;
    expect(iso(s.expected_next_date)).toBe("2026-10-26");
  });

  it("is due soon the day before, and a manual interval wins", async () => {
    const d = await driver();
    const c = await customer(d);
    await sell(c, d, 3, "2026-10-17");
    await pg.query("update customers set manual_interval_days = 7 where id = $1", [c]);
    const s = (await schedule(c))!;
    expect([iso(s.expected_next_date), s.status]).toEqual(["2026-10-24", "due_soon"]);
  });

  it("keeps the unpaid balance", async () => {
    const d = await driver();
    const c = await customer(d);
    await sell(c, d, 3, "2026-10-20", false, 16.6667);
    await sell(c, d, 2, "2026-10-21", true);
    expect(Number((await schedule(c))!.balance)).toBe(50);
  });
});

describe("driver pay", () => {
  type Day = { day: Date; gallons: string; base: string; commission: string; bonus: string; pay: string };
  const days = async (id: string) =>
    (await pg.query<Day>("select * from driver_day_pay('2026-10-19', '2026-10-24') where driver_id = $1 order by day", [id])).rows;

  it("is base + commission per gallon + every bonus tier reached that day", async () => {
    const d = await driver(300, 2, '[{"gallons": 50, "amount": 25}, {"gallons": 100, "amount": 50}]');
    const c = await customer(d);
    await sell(c, d, 60, "2026-10-20");
    await sell(c, d, 45, "2026-10-20");
    await sell(c, d, 10, "2026-10-21");
    const [mon, tue] = await days(d);
    expect([mon!.gallons, mon!.commission, mon!.bonus, mon!.pay].map(Number)).toEqual([105, 210, 75, 585]);
    expect([tue!.bonus, tue!.pay].map(Number)).toEqual([0, 320]);
  });

  it("pays a washer every open day on everything sold, walk-ins included", async () => {
    const w = await driver(200, 1, "[]", "washer");
    await sell(null, null, 30, "2026-10-20");
    const rows = await days(w);
    // Mon 19 to Fri 23 (today): 5 days, no Sunday, nothing after today.
    expect(rows.map((r) => iso(r.day))).toEqual(["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"]);
    expect(rows.map((r) => Number(r.pay))).toEqual([200, 230, 200, 200, 200]);
  });

  it("pays what is owed once, and a bale lowers it", async () => {
    const d = await driver(300);
    const c = await customer(d);
    await sell(c, d, 10, "2026-10-20");
    await sell(c, d, 10, "2026-10-21");
    await pg.query("insert into payouts (driver_id, period_from, period_to, amount, kind) values ($1, '2026-10-20', '2026-10-20', 100, 'advance')", [d]);
    const pay = async () => Number((await one<{ p: string }>("select pay_driver($1, '2026-10-23') as p", [d]))!.p);
    expect(await pay()).toBe(500);
    expect(await pay()).toBe(0); // a double tap pays nothing more
  });
});
