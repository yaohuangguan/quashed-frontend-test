import { useCallback, useEffect, useState } from "react";
import type { ProviderSummary } from "@shared/providers.ts";
import { api, errorCodeOf, type ApiErrorCode } from "../lib/api-client.ts";

type ProvidersState =
  | { status: "loading" }
  | { status: "error"; code: ApiErrorCode }
  | { status: "ready"; providers: ProviderSummary[] };

export function useProviders() {
  const [state, setState] = useState<ProvidersState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    api
      .listProviders(controller.signal)
      .then((providers) => setState({ status: "ready", providers }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ status: "error", code: errorCodeOf(error) });
      });
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}
