// Reads the provider catalog and address suggestions.
import type { Sql } from "postgres";
import type { ComparisonColumnId, FeatureValue, PurchaseForm } from "../_shared/providers.ts";

export type ProviderRow = {
  id: string;
  name: string;
  tagline: string;
  monthlyPriceCents: number;
  retrievedAt: string;
  features: Record<ComparisonColumnId, FeatureValue>;
  purchaseForm: PurchaseForm;
};

export function createCatalogStore(sql: Sql) {
  async function listProviders(): Promise<ProviderRow[]> {
    const rows = await sql<ProviderRow[]>`
      select id, name, tagline,
             monthly_price_cents as "monthlyPriceCents",
             to_json(retrieved_at)#>>'{}' as "retrievedAt",
             features, purchase_form as "purchaseForm"
      from public.providers
      order by sort_order, id`;
    return [...rows];
  }

  async function findProvider(id: string): Promise<ProviderRow | null> {
    const [row] = await sql<ProviderRow[]>`
      select id, name, tagline,
             monthly_price_cents as "monthlyPriceCents",
             to_json(retrieved_at)#>>'{}' as "retrievedAt",
             features, purchase_form as "purchaseForm"
      from public.providers
      where id = ${id}`;
    return row ?? null;
  }

  /** Addresses that start with the query, ignoring case. */
  async function searchAddresses(query: string, limit: number): Promise<string[]> {
    const pattern = query.replace(/[\\%_]/g, (c) => `\\${c}`) + "%";
    const rows = await sql<{ line: string }[]>`
      select line from public.address_suggestions
      where line ilike ${pattern}
      order by line
      limit ${limit}`;
    return rows.map((r) => r.line);
  }

  return { listProviders, findProvider, searchAddresses };
}

export type CatalogStore = ReturnType<typeof createCatalogStore>;
