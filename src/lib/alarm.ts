/** The two daily alarms, Monday to Saturday (Manila time):
 * - "lunch": from 1:00 pm while no sale is logged for today;
 * - "evening": from 6:30 pm until the manager taps "Paid and unpaid checked".
 * The same rule runs in SQL (`alarm_due`) to decide when to push. */
export type Alarm = "lunch" | "evening" | null;

export function alarmFor(manilaTime: string, closed: boolean, hasSales: boolean, checked: boolean): Alarm {
  if (closed) return null;
  if (manilaTime >= "13:00" && !hasSales) return "lunch";
  if (manilaTime >= "18:30" && !checked) return "evening";
  return null;
}

export const ALARM_TEXT = {
  lunch: { title: "No sales logged yet today", body: "Log today's customers now. This keeps ringing until you do.", url: "/" },
  evening: {
    title: "Check paid and unpaid",
    body: "Mark today's paid and unpaid, then tap Checked. This keeps ringing until you do.",
    url: "/history",
  },
} as const;
