export type CustomerStatus = "new" | "on_schedule" | "due_soon" | "overdue";

/** Reaching `gallons` in one day adds `amount` pesos to that day's pay. */
export interface Bonus {
  gallons: number;
  amount: number;
}

export interface Driver {
  id: string;
  name: string;
  base_salary: number;
  rate_per_gallon: number;
  bonuses: Bonus[];
  active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  /** Subdivision or place, e.g. Mabuhay */
  area: string | null;
  driver_id: string;
  containers_out: number;
  /** null = station price */
  price_per_gallon: number | null;
  /** Gallons in the deal the price was typed as: 3 for "50 pesos for 3" */
  price_qty: number;
  computed_interval_days: number | null;
  usual_gallons: number | null;
  balance: number;
  last_transaction_at: string | null;
  expected_next_date: string | null;
  status: CustomerStatus;
  created_at: string;
}

export interface Transaction {
  id: string;
  /** null on a walk-in sale */
  customer_id: string | null;
  driver_id: string | null;
  gallons: number;
  unit_price: number;
  paid: boolean;
  delivered_on: string;
  created_at: string;
}

export interface Payout {
  id: string;
  driver_id: string;
  period_from: string;
  period_to: string;
  amount: number;
  paid_at: string;
}

export interface Expense {
  id: string;
  spent_on: string;
  category: string;
  amount: number;
  note: string | null;
  /** A monthly bill: counted in the month and year reports only */
  monthly: boolean;
}
