// Routes requests to handlers, checks the API key and turns errors into
// responses. Dependencies are passed in, so tests can use a test database and
// a fixed clock.
import type { Sql } from "postgres";
import * as catalogRoutes from "./catalog-routes.ts";
import { createCatalogStore } from "./catalog-store.ts";
import { AppError, CORS_HEADERS, errorResponse } from "./http.ts";
import * as purchaseRoutes from "./purchase-routes.ts";
import { createPurchaseStore } from "./purchase-store.ts";

export type AppDeps = {
  sql: Sql;
  /** Keys accepted in the `apikey` header. Empty means every request is refused. */
  apiKeys: string[];
  now: () => Date;
  logError: (event: string, fields: Record<string, unknown>) => void;
};

/** The function is served under /api (hosted) or /functions/v1/api (local CLI). */
const PREFIX = /^(?:\/functions\/v1)?\/api(?=\/|$)/;

export function createApp(deps: AppDeps) {
  const catalog = createCatalogStore(deps.sql);
  const purchases = createPurchaseStore(deps.sql);
  const keys = new Set(deps.apiKeys.filter(Boolean));

  async function route(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(PREFIX, "").replace(/\/+$/, "") || "/";
    const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
    const method = req.method;

    // GET /providers
    if (parts.length === 1 && parts[0] === "providers") {
      if (method === "GET") return catalogRoutes.listProviders(catalog);
    }
    // GET /providers/:id/purchase-options
    else if (parts.length === 3 && parts[0] === "providers" && parts[2] === "purchase-options") {
      if (method === "GET") return catalogRoutes.getPurchaseOptions(catalog, parts[1]!, deps.now());
    }
    // GET /addresses?q=
    else if (parts.length === 1 && parts[0] === "addresses") {
      if (method === "GET") return catalogRoutes.searchAddresses(catalog, url);
    }
    // POST /connections
    else if (parts.length === 1 && parts[0] === "connections") {
      if (method === "POST") return purchaseRoutes.createConnection(req, catalog, purchases);
    }
    // DELETE /connections/:id
    else if (parts.length === 2 && parts[0] === "connections") {
      if (method === "DELETE") return purchaseRoutes.disconnect(purchases, parts[1]!);
    }
    // POST /orders
    else if (parts.length === 1 && parts[0] === "orders") {
      if (method === "POST") return purchaseRoutes.createOrder(req, catalog, purchases, deps.now());
    }
    // POST /feedback
    else if (parts.length === 1 && parts[0] === "feedback") {
      if (method === "POST") return purchaseRoutes.createFeedback(req, purchases);
    } else {
      throw new AppError("NOT_FOUND");
    }
    throw new AppError("METHOD_NOT_ALLOWED");
  }

  return async function handle(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
    try {
      const key = req.headers.get("apikey") ?? "";
      if (!keys.has(key)) throw new AppError("INVALID_API_KEY");
      return await route(req);
    } catch (error) {
      if (error instanceof AppError) return errorResponse(error);
      // Log the error type only: messages can contain request data.
      deps.logError("api.unhandled_error", {
        method: req.method,
        path: new URL(req.url).pathname,
        name: error instanceof Error ? error.name : typeof error,
        code: (error as { code?: unknown })?.code,
      });
      return errorResponse(new AppError("INTERNAL"));
    }
  };
}
