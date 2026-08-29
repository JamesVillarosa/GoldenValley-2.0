import { getDrivers } from "@/lib/actions/drivers";
import { SalaryView } from "@/components/salary-view";

export default async function SalaryPage() {
  const drivers = await getDrivers();

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-6">
      <header className="pb-4">
        <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
          Salary
        </h1>
      </header>

      <SalaryView drivers={drivers} />
    </div>
  );
}
