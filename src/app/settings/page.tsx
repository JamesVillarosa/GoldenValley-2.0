import { getPrice } from "@/lib/actions/reports";
import { PageHeader } from "@/components/page-header";
import { PushOptIn } from "@/components/push-opt-in";
import { SettingsForms } from "@/components/settings-forms";

export default async function SettingsPage() {
  return (
    <div className="page">
      <PageHeader title="Settings" />
      <div className="flex flex-col gap-6">
        <section aria-labelledby="notify-title" className="card p-4">
          <h2 id="notify-title" className="section-title">
            Daily reminder
          </h2>
          <p className="mt-1 mb-3 text-[0.9375rem] text-ink-muted">
            Every morning at 7:00 this phone gets a notification listing how many customers are due.
          </p>
          <PushOptIn />
        </section>
        <SettingsForms price={await getPrice()} />
      </div>
    </div>
  );
}
