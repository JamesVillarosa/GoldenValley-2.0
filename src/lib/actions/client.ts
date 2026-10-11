// Saving actions for client components: a failure arrives as a thrown Error
// carrying the message the server wrote (see lib/result.ts).

import * as customers from "@/lib/actions/customers";
import * as transactions from "@/lib/actions/transactions";
import * as drivers from "@/lib/actions/drivers";
import * as reports from "@/lib/actions/reports";
import * as auth from "@/lib/actions/auth";
import { unwrapped } from "@/lib/result";

export const saveCustomer = unwrapped(customers.saveCustomer);
export const deleteCustomer = unwrapped(customers.deleteCustomer);
export const saveTransaction = unwrapped(transactions.saveTransaction);
export const deleteTransaction = unwrapped(transactions.deleteTransaction);
export const setGallons = unwrapped(transactions.setGallons);
export const setPaid = unwrapped(transactions.setPaid);
export const settleCustomer = unwrapped(transactions.settleCustomer);
export const saveDriver = unwrapped(drivers.saveDriver);
export const removeDriver = unwrapped(drivers.removeDriver);
export const recordPayout = unwrapped(reports.recordPayout);
export const undoPayouts = unwrapped(reports.undoPayouts);
export const addExpense = unwrapped(reports.addExpense);
export const deleteExpense = unwrapped(reports.deleteExpense);
export const changePin = unwrapped(auth.changePin);
