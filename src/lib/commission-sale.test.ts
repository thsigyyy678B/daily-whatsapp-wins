import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCommissionSalePackageName,
  getCampaignCheckoutTotal,
  getCommissionSalePackageName,
  isCommissionSalePackage,
} from "./commission-sale.ts";

describe("Commission Sale checkout and campaign marker", () => {
  it("adds the admin-set fee only when the eligible add-on is selected", () => {
    assert.equal(getCampaignCheckoutTotal(500, 75, true), 575);
    assert.equal(getCampaignCheckoutTotal(500, 75, false), 500);
  });

  it("marks selected campaigns for seller visibility without changing regular package names", () => {
    const selected = buildCommissionSalePackageName("Starter", true);
    assert.equal(selected, "Starter · Commission Sale");
    assert.equal(isCommissionSalePackage(selected), true);
    assert.equal(getCommissionSalePackageName(selected), "Starter");
    assert.equal(buildCommissionSalePackageName("Starter", false), "Starter");
  });

  it("avoids duplicating the Commission Sale marker", () => {
    assert.equal(buildCommissionSalePackageName("Starter · Commission Sale", true), "Starter · Commission Sale");
  });
});