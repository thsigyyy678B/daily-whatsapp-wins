const COMMISSION_SALE_PATTERN = / · Commission Sale(?: · ₹(\d+(?:\.\d+)?)\/sale)?$/;

export function getCommissionSalePackageName(packageName: string): string {
  return packageName.replace(COMMISSION_SALE_PATTERN, "");
}

export function isCommissionSalePackage(packageName: string): boolean {
  return COMMISSION_SALE_PATTERN.test(packageName);
}

export function getSellerCommission(packageName: string): number | null {
  const amount = packageName.match(COMMISSION_SALE_PATTERN)?.[1];
  return amount ? Number(amount) : null;
}

export function buildCommissionSalePackageName(packageName: string, enabled: boolean, sellerCommission = 0): string {
  const cleanName = getCommissionSalePackageName(packageName);
  return enabled ? `${cleanName} · Commission Sale · ₹${Math.max(0, Number(sellerCommission) || 0)}/sale` : cleanName;
}

export function getCampaignCheckoutTotal(packageAmount: number, commissionSaleFee: number, enabled: boolean): number {
  return Math.max(0, Number(packageAmount) || 0) + (enabled ? Math.max(0, Number(commissionSaleFee) || 0) : 0);
}