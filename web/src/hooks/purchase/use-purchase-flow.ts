// State of the purchase fly-out, step by step:
//   connecting -> retrieving -> details -> payment -> confirmed
// "Connecting..." and "Retrieving data..." each stay on screen for at least
// config.stepDelayMs, as the design asks, while the real requests run.
import { useCallback, useEffect, useRef, useState } from "react";
import type { PurchaseOptions } from "@shared/providers.ts";
import type { CreateOrderResponse, PaymentDetails, PurchaseDetails } from "@shared/purchase.ts";
import { config } from "../../config.ts";
import { api, ApiError, errorCodeOf, type ApiErrorCode } from "../../lib/api-client.ts";

export type FlowStep =
  | { step: "connecting" }
  | { step: "retrieving"; connectionId: string }
  | { step: "details"; connectionId: string; options: PurchaseOptions }
  | { step: "payment"; connectionId: string; options: PurchaseOptions; details: PurchaseDetails }
  | { step: "confirmed"; options: PurchaseOptions; order: CreateOrderResponse }
  | { step: "failed"; code: ApiErrorCode };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Resolves with the work's result, but not before `ms` has passed. */
async function atLeast<T>(ms: number, work: Promise<T>): Promise<T> {
  const [result] = await Promise.all([work, wait(ms)]);
  return result;
}

export function usePurchaseFlow(providerId: string) {
  const [state, setState] = useState<FlowStep>({ step: "connecting" });
  const [attempt, setAttempt] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<ApiError | null>(null);
  const connectionRef = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setState({ step: "connecting" });
    (async () => {
      try {
        const connectionId = await atLeast(config.stepDelayMs, api.connect(providerId, signal));
        connectionRef.current = connectionId;
        if (signal.aborted) return;
        setState({ step: "retrieving", connectionId });
        const options = await atLeast(config.stepDelayMs, api.getPurchaseOptions(providerId, signal));
        if (!signal.aborted) setState({ step: "details", connectionId, options });
      } catch (error) {
        if (!signal.aborted) setState({ step: "failed", code: errorCodeOf(error) });
      }
    })();
    return () => controller.abort();
  }, [providerId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const continueToPayment = useCallback((details: PurchaseDetails) => {
    setState((current) => (current.step === "details" ? { ...current, step: "payment", details } : current));
  }, []);

  const pay = useCallback(
    async (payment: PaymentDetails) => {
      if (state.step !== "payment" || submitting) return;
      setSubmitting(true);
      setPaymentError(null);
      try {
        const order = await api.createOrder(state.connectionId, state.details, payment);
        setState({ step: "confirmed", options: state.options, order });
      } catch (error) {
        setPaymentError(error instanceof ApiError ? error : new ApiError("INTERNAL"));
      } finally {
        setSubmitting(false);
      }
    },
    [state, submitting],
  );

  /** Ends the provider session. The fly-out closes whether or not this succeeds. */
  const disconnect = useCallback(() => {
    const connectionId = connectionRef.current;
    connectionRef.current = null;
    if (connectionId) void api.disconnect(connectionId).catch(() => {});
  }, []);

  return { state, retry, continueToPayment, pay, submitting, paymentError, disconnect };
}
