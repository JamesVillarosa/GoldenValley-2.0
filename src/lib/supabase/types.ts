export type CustomerStatus = "new" | "on_schedule" | "due_soon" | "overdue";

export interface Driver {
  id: string;
  name: string;
  base_salary: number;
  rate_per_gallon: number;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  driver_id: string;
  manual_interval_days: number | null;
  computed_interval_days: number | null;
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
  created_at: string;
  settled_at: string | null;
}

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

