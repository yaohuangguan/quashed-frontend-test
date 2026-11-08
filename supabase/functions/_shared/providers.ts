// Provider catalog types shared by the API and the web app.

/** Columns of the comparison table, in display order. */
export const COMPARISON_COLUMNS = [
  { id: "yearlyPayment", label: "Yearly payment" },
  { id: "data", label: "Data" },
  { id: "roaming", label: "Roaming" },
  { id: "firewall", label: "Firewall" },
  { id: "vpn", label: "VPN" },
  { id: "support", label: "24h Support" },
  { id: "router", label: "Router" },
] as const;

export type ComparisonColumnId = (typeof COMPARISON_COLUMNS)[number]["id"];

/** One cell of the comparison table. */
export type FeatureValue =
  | { type: "included" }
  | { type: "excluded" }
  | { type: "text"; text: string }
  | { type: "price"; amountCents: number; per: "year" | "month" | "GB" };

export type ProviderSummary = {
  id: string;
  name: string;
  tagline: string;
  monthlyPriceCents: number;
  /** True for the provider with the lowest monthly price. */
  isCheapest: boolean;
  /** ISO timestamp of when the prices were last retrieved. */
  retrievedAt: string;
  features: Record<ComparisonColumnId, FeatureValue>;
};

/**
 * Questions after name and address. Data plan and start date are always
 * asked; the others only when listed.
 */
export type PurchaseField =
  | "dataPlan"
  | "contractStartDate"
  | "additionalServices"
  | "currentProvider"
  | "needsRouter";

export type PurchaseForm = {
  dataPlans: string[];
  /** Questions after name and address, in display order. */
  fields: PurchaseField[];
  /** Must be empty unless fields lists "additionalServices". */
  additionalServices: string[];
};

/** What the purchase fly-out needs after "Retrieving data...". */
export type PurchaseOptions = {
  providerId: string;
  providerName: string;
  form: PurchaseForm;
  currentProviders: readonly string[];
  /** Earliest allowed contract start date, as YYYY-MM-DD. */
  earliestStartDate: string;
};

/** Answers to "What is your current Internet provider?". */
export const CURRENT_PROVIDERS = ["Vodafone", "Spark", "Sky", "My Republic"] as const;

/** Marks the provider with the lowest monthly price. Ties mark every match. */
export function markCheapest<T extends { monthlyPriceCents: number }>(
  providers: T[],
): (T & { isCheapest: boolean })[] {
  if (providers.length === 0) return [];
  const lowest = Math.min(...providers.map((p) => p.monthlyPriceCents));
  return providers.map((p) => ({ ...p, isCheapest: p.monthlyPriceCents === lowest }));
}
