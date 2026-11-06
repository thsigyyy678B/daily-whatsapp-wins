import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateBusinessMonthlyDue,
  calculateEarnerMonthlyDue,
  MAX_BUSINESSES,
  MAX_USERS,
} from "@/lib/limits";

describe("business capacity and monthly due", () => {
  it("allows up to 50 registered business accounts", () => {
    assert.equal(MAX_BUSINESSES, 50);
  });

  it("allows up to 250 earner accounts", () => {
    assert.equal(MAX_USERS, 250);
  });

  it("calculates ₹50 per currently registered business", () => {
    assert.equal(calculateBusinessMonthlyDue(1), 50);
    assert.equal(calculateBusinessMonthlyDue(2), 100);
    assert.equal(calculateBusinessMonthlyDue(1), 50);
  });

  it("calculates earner month-end due from each current user's completed tasks", () => {
    assert.equal(calculateEarnerMonthlyDue([0]), 25);
    assert.equal(calculateEarnerMonthlyDue([2]), 25);
    assert.equal(calculateEarnerMonthlyDue([3]), 35);
    assert.equal(calculateEarnerMonthlyDue([4]), 35);
    assert.equal(calculateEarnerMonthlyDue([5]), 45);
    assert.equal(calculateEarnerMonthlyDue([10]), 45);
    assert.equal(calculateEarnerMonthlyDue([11]), 50);
    assert.equal(calculateEarnerMonthlyDue([2, 3, 5, 10, 11]), 200);
  });
});