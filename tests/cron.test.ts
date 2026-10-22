import { afterEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn(async () => ({ error: null }));
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: () => ({ rpc }) }));
vi.mock("@/lib/push", () => ({ notifyDue: vi.fn(async () => ({ due: 3, sent: 1 })) }));

afterEach(() => vi.useRealTimers());

const { GET } = await import("@/app/api/cron/notify/route");
const call = (auth?: string) => GET(new Request("https://gv.test/api/cron/notify", { headers: auth ? { authorization: auth } : {} }));

describe("cron notify", () => {
  it("refuses without the secret, and when no secret is configured", async () => {
    delete process.env.CRON_SECRET;
    expect((await call("Bearer undefined")).status).toBe(401);
    process.env.CRON_SECRET = "s3cret";
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("recomputes schedules but sends nothing on a Sunday", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-25T02:00:00Z"));
    expect(await (await call("Bearer s3cret")).json()).toEqual({ due: 0, sent: 0, closed: true });
    expect(rpc).toHaveBeenCalledWith("recompute_all_customer_schedules");
  });
  it("notifies on an open day", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-23T02:00:00Z"));
    expect(await (await call("Bearer s3cret")).json()).toEqual({ due: 3, sent: 1 });
  });
});
