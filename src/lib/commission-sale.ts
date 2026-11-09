export const COMMISSION_SALE_PACKAGE_MARKER = " · Commission Sale";

export function getCommissionSalePackageName(packageName: string): string {
  return packageName.endsWith(COMMISSION_SALE_PACKAGE_MARKER)
    ? packageName.slice(0, -COMMISSION_SALE_PACKAGE_MARKER.length)
    : packageName;
}

export function isCommissionSalePackage(packageName: string): boolean {
  return packageName.endsWith(COMMISSION_SALE_PACKAGE_MARKER);
}

export function buildCommissionSalePackageName(packageName: string, enabled: boolean): string {
  const cleanName = getCommissionSalePackageName(packageName);
  return enabled ? `${cleanName}${COMMISSION_SALE_PACKAGE_MARKER}` : cleanName;
}

export function getCampaignCheckoutTotal(packageAmount: number, commissionSaleFee: number, enabled: boolean): number {
  return Math.max(0, Number(packageAmount) || 0) + (enabled ? Math.max(0, Number(commissionSaleFee) || 0) : 0);
}