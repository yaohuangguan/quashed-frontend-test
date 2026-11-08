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

export async function createOrder(req: Request, catalog: CatalogStore, purchases: PurchaseStore, now: Date) {
  const request = parseOrThrow(createOrderSchema, await readJson(req));
  const connection = await purchases.findConnection(request.connectionId);
  if (!connection) throw new AppError("CONNECTION_NOT_FOUND");
  if (connection.disconnectedAt) throw new AppError("CONNECTION_CLOSED");
  const provider = await catalog.findProvider(connection.providerId);
  if (!provider) throw new AppError("PROVIDER_NOT_FOUND");

  const details = parseOrThrow(
    purchaseDetailsSchema(provider.purchaseForm, isoDateInZone(now)),
    request.details,
    "details",
  );
  const card = parseOrThrow(paymentSchema(now), request.payment, "payment");

  const orderId = await purchases.createOrder({
    connectionId: connection.id,
    providerId: provider.id,
    details,
    // Only the last four digits are stored; the CVV is checked and dropped.
    cardLast4: card.cardNumber.slice(-4),
    cardHolder: card.cardHolder,
    cardExpiryMonth: card.expiryMonth,
    cardExpiryYear: card.expiryYear,
  });
  if (!orderId) throw new AppError("ORDER_ALREADY_EXISTS");

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
