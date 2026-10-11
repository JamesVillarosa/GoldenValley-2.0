-- A customer pays price_per_gallon for single gallons and, when a deal is set,
-- deal_price for every full group of price_qty gallons (50 pesos for 3, 20 for 1).
alter table customers add column deal_price numeric check (deal_price >= 0);
