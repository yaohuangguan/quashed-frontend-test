// Endpoints that change state: connect, disconnect, order and feedback.
import { isoDateInZone } from "../_shared/dates.ts";
import {
  createConnectionSchema,
  createOrderSchema,
  feedbackSchema,
  paymentSchema,
  purchaseDetailsSchema,
  type CreateConnectionResponse,
  type CreateOrderResponse,
} from "../_shared/purchase.ts";
import type { CatalogStore } from "./catalog-store.ts";
import { AppError, json, noContent, parseOrThrow, readJson } from "./http.ts";
import type { PurchaseStore } from "./purchase-store.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createConnection(req: Request, catalog: CatalogStore, purchases: PurchaseStore) {
  const { providerId } = parseOrThrow(createConnectionSchema, await readJson(req));
  const provider = await catalog.findProvider(providerId);
  if (!provider) throw new AppError("PROVIDER_NOT_FOUND");
  const body: CreateConnectionResponse = { connectionId: await purchases.createConnection(provider.id) };
  return json(body, 201);
}

export async function disconnect(purchases: PurchaseStore, connectionId: string) {
  if (!UUID.test(connectionId) || !(await purchases.disconnect(connectionId))) {
    throw new AppError("CONNECTION_NOT_FOUND");
  }
  return noContent();
}

/** Hex SHA-256 of a value's JSON, used to recognise a repeated order request. */
async function hashOf(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Places the order for a connection. Repeating the same request (for example
 * after a lost response) returns the existing order with 200; a different
 * request on a connection that already has an order is refused with 409.
 */
export async function createOrder(req: Request, catalog: CatalogStore, purchases: PurchaseStore, now: Date) {
  const request = parseOrThrow(createOrderSchema, await readJson(req));
  const connection = await purchases.findConnection(request.connectionId);
  if (!connection) throw new AppError("CONNECTION_NOT_FOUND");
  const provider = await catalog.findProvider(connection.providerId);
  if (!provider) throw new AppError("PROVIDER_NOT_FOUND");

  const details = parseOrThrow(
    purchaseDetailsSchema(provider.purchaseForm, isoDateInZone(now)),
    request.details,
    "details",
  );
  const card = parseOrThrow(paymentSchema(now), request.payment, "payment");
  const requestHash = await hashOf({ details, card });

  const replay = async () => {
    const existing = await purchases.findOrderByConnection(connection.id);
    if (!existing || existing.requestHash !== requestHash) throw new AppError("ORDER_ALREADY_EXISTS");
    const body: CreateOrderResponse = {
      orderId: existing.id,
      providerName: provider.name,
      contractStartDate: existing.contractStartDate,
    };
    return json(body, 200);
  };

  // A retry may arrive after the user disconnected, so check for it first.
  if (await purchases.findOrderByConnection(connection.id)) return replay();
  if (connection.disconnectedAt) throw new AppError("CONNECTION_CLOSED");

  const orderId = await purchases.createOrder({
    connectionId: connection.id,
    providerId: provider.id,
    details,
    cardLast4: card.cardLast4,
    cardHolder: card.cardHolder,
    cardExpiryMonth: card.expiryMonth,
    cardExpiryYear: card.expiryYear,
    requestHash,
  });
  // Lost a race with an identical request: answer like a retry.
  if (!orderId) return replay();

  const body: CreateOrderResponse = {
    orderId,
    providerName: provider.name,
    contractStartDate: details.contractStartDate,
  };
  return json(body, 201);
}

export async function createFeedback(req: Request, purchases: PurchaseStore) {
  const { orderId, message } = parseOrThrow(feedbackSchema, await readJson(req));
  if (!(await purchases.orderExists(orderId))) throw new AppError("ORDER_NOT_FOUND");
  if (!(await purchases.addFeedback(orderId, message))) throw new AppError("FEEDBACK_ALREADY_SENT");
  return noContent();
}
