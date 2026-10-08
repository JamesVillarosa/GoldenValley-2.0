-- Resetting a driver's day must NOT delete transactions: the scheduling
-- engine (calculate_customer_interval / recompute_customer_schedule) reads
-- full transaction history to predict each customer's next delivery, so
-- deleting rows would corrupt that forever. Instead, "reset" marks today's
-- transactions as settled (already paid out), and salary/the entry screen's
-- "Today" list only count unsettled rows. Delivery history, dashboards, and
-- the interval algorithm keep reading every row regardless of settlement.

alter table transactions add column settled_at timestamptz;

create index transactions_driver_id_settled_at_idx on transactions (driver_id, settled_at);
