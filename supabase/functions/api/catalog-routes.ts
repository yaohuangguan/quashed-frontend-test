// GET endpoints for the provider catalog.
import { isoDateInZone } from "../_shared/dates.ts";
import { CURRENT_PROVIDERS, markCheapest, type ProviderSummary, type PurchaseOptions } from "../_shared/providers.ts";
import { LIMITS } from "../_shared/purchase.ts";
import type { CatalogStore } from "./catalog-store.ts";
import { AppError, json } from "./http.ts";

const ADDRESS_MIN_QUERY = 2;
const ADDRESS_RESULT_LIMIT = 5;

export async function listProviders(catalog: CatalogStore): Promise<Response> {
  const rows = await catalog.listProviders();
  const providers: ProviderSummary[] = markCheapest(rows).map((row) => ({
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    monthlyPriceCents: row.monthlyPriceCents,
    isCheapest: row.isCheapest,
    retrievedAt: row.retrievedAt,
    features: row.features,
  }));
  return json({ providers });
}

export async function getPurchaseOptions(catalog: CatalogStore, providerId: string, now: Date): Promise<Response> {
  const provider = await catalog.findProvider(providerId);
  if (!provider) throw new AppError("PROVIDER_NOT_FOUND");
  const options: PurchaseOptions = {
    providerId: provider.id,
    providerName: provider.name,
    form: provider.purchaseForm,
    currentProviders: CURRENT_PROVIDERS,
    earliestStartDate: isoDateInZone(now),
  };
  return json(options);
}

export async function searchAddresses(catalog: CatalogStore, url: URL): Promise<Response> {
  const query = (url.searchParams.get("q") ?? "").trim();
  if (query.length > LIMITS.addressQueryLength) {
    throw new AppError("VALIDATION_FAILED", [{ path: "q", message: "Too long" }]);
  }
  const addresses =
    query.length < ADDRESS_MIN_QUERY ? [] : await catalog.searchAddresses(query, ADDRESS_RESULT_LIMIT);
  return json({ addresses });
}
