import { autumnSeoDataCreditsToUsd } from "@/shared/billing";

export function formatCredits(credits: number) {
  return credits.toLocaleString();
}

/** Credits are an internal unit; operators think in the dollars they map to. */
export function formatCreditsAsUsd(credits: number) {
  return `$${autumnSeoDataCreditsToUsd(credits).toFixed(2)}`;
}

export function formatPrice(priceUsdCents: number) {
  return priceUsdCents === 0 ? "Free" : `$${(priceUsdCents / 100).toFixed(2)}`;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}
