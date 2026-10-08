export type CustomerStatus = "new" | "on_schedule" | "due_soon" | "overdue";

export interface Driver {
  id: string;
  name: string;
  base_salary: number;
  rate_per_gallon: number;
  active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  driver_id: string;
  containers_out: number;
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
  customer_id: string;
  driver_id: string;
  gallons: number;
  unit_price: number;
  paid: boolean;
  delivered_on: string;
  created_at: string;
}
