import { describe, expect, test } from "bun:test";
import {
  calculateBusinessMonthlyDue,
  MAX_BUSINESSES,
} from "@/lib/limits";

describe("business capacity and monthly due", () => {
  test("allows up to 50 registered business accounts", () => {
    expect(MAX_BUSINESSES).toBe(50);
  });

  test("calculates ₹50 per currently registered business", () => {
    expect(calculateBusinessMonthlyDue(1)).toBe(50);
    expect(calculateBusinessMonthlyDue(2)).toBe(100);
    expect(calculateBusinessMonthlyDue(1)).toBe(50);
  });
});