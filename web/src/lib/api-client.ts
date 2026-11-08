// The only module that talks to the API. Every request sends the publishable
// key and every failure becomes an ApiError with a stable code.
import type { ErrorBody, ErrorCode } from "@shared/errors.ts";
import type { ProviderSummary, PurchaseOptions } from "@shared/providers.ts";
import type {
  CreateConnectionResponse,
  CreateOrderResponse,
  PaymentDetails,
  PurchaseDetails,
} from "@shared/purchase.ts";
import { config } from "../config.ts";

export type ApiErrorCode = ErrorCode | "NETWORK";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly fields: { path: string; message: string }[];

  constructor(code: ApiErrorCode, fields: { path: string; message: string }[] = []) {
    super(code);
    this.code = code;
    this.fields = fields;
  }
}

export function errorCodeOf(error: unknown): ApiErrorCode {
  return error instanceof ApiError ? error.code : "INTERNAL";
}

async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${config.apiUrl}${path}`, {
      method,
      signal,
      headers: {
        apikey: config.publishableKey,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError("NETWORK");
  }
  if (response.status === 204) return undefined as T;
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (payload as Partial<ErrorBody> | null)?.error;
    throw new ApiError(error?.code ?? "INTERNAL", error?.fields ?? []);
  }
  return payload as T;
}

export const api = {
  listProviders: (signal?: AbortSignal) =>
    request<{ providers: ProviderSummary[] }>("GET", "/providers", undefined, signal).then((r) => r.providers),

  getPurchaseOptions: (providerId: string, signal?: AbortSignal) =>
    request<PurchaseOptions>("GET", `/providers/${encodeURIComponent(providerId)}/purchase-options`, undefined, signal),

  searchAddresses: (query: string, signal?: AbortSignal) =>
    request<{ addresses: string[] }>("GET", `/addresses?q=${encodeURIComponent(query)}`, undefined, signal).then(
      (r) => r.addresses,
    ),

  connect: (providerId: string, signal?: AbortSignal) =>
    request<CreateConnectionResponse>("POST", "/connections", { providerId }, signal).then((r) => r.connectionId),

  disconnect: (connectionId: string) => request<void>("DELETE", `/connections/${encodeURIComponent(connectionId)}`),

  createOrder: (connectionId: string, details: PurchaseDetails, payment: PaymentDetails) =>
    request<CreateOrderResponse>("POST", "/orders", { connectionId, details, payment }),

  sendFeedback: (orderId: string, message: string) => request<void>("POST", "/feedback", { orderId, message }),
};
