import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateBusinessMonthlyDue,
  MAX_BUSINESSES,
} from "@/lib/limits";

describe("business capacity and monthly due", () => {
  it("allows up to 50 registered business accounts", () => {
    assert.equal(MAX_BUSINESSES, 50);
  });

  it("calculates ₹50 per currently registered business", () => {
    assert.equal(calculateBusinessMonthlyDue(1), 50);
    assert.equal(calculateBusinessMonthlyDue(2), 100);
    assert.equal(calculateBusinessMonthlyDue(1), 50);
  });
});