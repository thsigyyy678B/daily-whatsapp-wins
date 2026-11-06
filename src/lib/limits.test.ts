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

  it("charges ₹25 for earners with fewer than 3 completed tasks", () => {
    assert.equal(calculateEarnerMonthlyDue([0, 2]), 50);
  });

  it("charges ₹35 for earners with 3 or 4 completed tasks", () => {
    assert.equal(calculateEarnerMonthlyDue([3]), 35);
    assert.equal(calculateEarnerMonthlyDue([4]), 35);
  });

  it("charges ₹45 for earners with 5 through 10 completed tasks", () => {
    assert.equal(calculateEarnerMonthlyDue([5]), 45);
    assert.equal(calculateEarnerMonthlyDue([10]), 45);
  });

  it("charges ₹50 for earners with more than 10 completed tasks", () => {
    assert.equal(calculateEarnerMonthlyDue([11]), 50);
  });

  it("adds each current earner's applicable month-end amount", () => {
    assert.equal(calculateEarnerMonthlyDue([2, 3, 5, 10, 11]), 200);
  });
});