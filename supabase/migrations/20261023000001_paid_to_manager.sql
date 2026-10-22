-- A customer can pay the manager directly. That sale is paid, but the cash
-- never passes through the driver, so it stays out of the driver's remit.
alter table transactions add column paid_to_manager boolean not null default false;
