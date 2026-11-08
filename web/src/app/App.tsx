// Page shell: header, provider table, and whichever overlay is open.
import { useState } from "react";
import type { ProviderSummary } from "@shared/providers.ts";
import { Header } from "../components/Header.tsx";
import { FeedbackPopup } from "../features/feedback/FeedbackPopup.tsx";
import { ProvidersPage } from "../features/providers/ProvidersPage.tsx";
import { PurchaseFlyout } from "../features/purchase/PurchaseFlyout.tsx";

type Overlay =
  | { kind: "none" }
  | { kind: "purchase"; provider: ProviderSummary; session: number }
  | { kind: "feedback"; orderId: string };

export function App() {
  const [overlay, setOverlay] = useState<Overlay>({ kind: "none" });

  return (
    <>
      <Header />
      <ProvidersPage onGetStarted={(provider) => setOverlay({ kind: "purchase", provider, session: Date.now() })} />
      {overlay.kind === "purchase" && (
        <PurchaseFlyout
          // A new session each time, so reopening starts a fresh connection.
          key={overlay.session}
          provider={overlay.provider}
          onClose={(orderId) => setOverlay(orderId ? { kind: "feedback", orderId } : { kind: "none" })}
        />
      )}
      {overlay.kind === "feedback" && (
        <FeedbackPopup orderId={overlay.orderId} onClose={() => setOverlay({ kind: "none" })} />
      )}
    </>
  );
}
