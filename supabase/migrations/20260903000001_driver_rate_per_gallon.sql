-- Drivers earn a fixed amount per day worked plus a rate per gallon delivered.
-- base_salary is reinterpreted as the daily rate; rate_per_gallon is new.

alter table drivers add column rate_per_gallon numeric not null default 0;
