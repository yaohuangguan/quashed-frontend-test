import type { ProviderSummary } from "@shared/providers.ts";
import { Button } from "../../components/Button.tsx";
import { useProviders } from "../../hooks/use-providers.ts";
import { messages } from "../../locales/en.ts";
import { ProvidersTable } from "./ProvidersTable.tsx";

export function ProvidersPage({ onGetStarted }: { onGetStarted: (provider: ProviderSummary) => void }) {
  const { state, retry } = useProviders();
  return (
    <main className="page">
      <h1 className="visually-hidden">{messages.providers.title}</h1>
      {state.status === "loading" && (
        <p className="page__status" role="status">
          {messages.providers.loading}
        </p>
      )}
      {state.status === "error" && (
        <div className="page__status" role="alert">
          <p>
            {messages.providers.loadFailed} {messages.errors[state.code]}
          </p>
          <Button onClick={retry}>{messages.providers.retry}</Button>
        </div>
      )}
      {state.status === "ready" && <ProvidersTable providers={state.providers} onGetStarted={onGetStarted} />}
    </main>
  );
}
