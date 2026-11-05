// Platform capacity. Raise these values in code to accept more signups.
export const MAX_USERS = 90;
export const MAX_BUSINESSES = 50;
export const BUSINESS_MONTHLY_DUE_PER_ACCOUNT = 50;
export const BUSINESS_COUNT_CHANGED_EVENT = "business-count-changed";

export function calculateBusinessMonthlyDue(businessCount: number): number {
  return Math.max(0, Math.trunc(businessCount)) * BUSINESS_MONTHLY_DUE_PER_ACCOUNT;
}

import { supabase } from "@/lib/supabase";

export async function countRows(table: "app_users" | "businesses"): Promise<number> {
  const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
  return count ?? 0;
}

export const CLOSED_MESSAGE =
  "Platform is currently not accepting new signups. All seats are filled — please check back later.";
