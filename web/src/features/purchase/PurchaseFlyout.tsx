// The fly-out for one provider. Renders the current step of the purchase
// flow. Every way of closing it (×, overlay, Cancel, Disconnect, Back to
// Dashboard) reports whether an order was placed, so the page can ask for
// feedback.
import type { ProviderSummary } from "@shared/providers.ts";
import { FlyOut } from "../../components/FlyOut.tsx";
import { usePurchaseFlow } from "../../hooks/purchase/use-purchase-flow.ts";
import { messages } from "../../locales/en.ts";
import { ConfirmationStep } from "./ConfirmationStep.tsx";
import { DetailsStep } from "./DetailsStep.tsx";
import { LoadingStep } from "./LoadingStep.tsx";
import { PaymentStep } from "./PaymentStep.tsx";

type PurchaseFlyoutProps = {
  provider: Pick<ProviderSummary, "id" | "name">;
  /** orderId is set when the user bought something before closing. */
  onClose: (orderId: string | null) => void;
};

export function PurchaseFlyout({ provider, onClose }: PurchaseFlyoutProps) {
  const flow = usePurchaseFlow(provider.id);
  const { state } = flow;
  const orderId = state.step === "confirmed" ? state.order.orderId : null;

  const close = () => onClose(orderId);
  const disconnect = () => {
    flow.disconnect();
    onClose(orderId);
  };

  return (
    <FlyOut onClose={close} label={provider.name}>
      {state.step === "connecting" && (
        <LoadingStep providerId={provider.id} providerName={provider.name} status={{ text: messages.purchase.connecting }} onClose={close} />
      )}
      {state.step === "retrieving" && (
        <LoadingStep providerId={provider.id} providerName={provider.name} status={{ text: messages.purchase.retrieving }} onClose={close} />
      )}
      {state.step === "failed" && (
        <LoadingStep
          providerId={provider.id}
          providerName={provider.name}
          status={{ error: messages.errors[state.code], onRetry: flow.retry }}
          onClose={close}
        />
      )}
      {state.step === "details" && (
        <DetailsStep options={state.options} onContinue={flow.continueToPayment} onCancel={close} onDisconnect={disconnect} />
      )}
      {state.step === "payment" && (
        <PaymentStep
          providerName={state.options.providerName}
          submitting={flow.submitting}
          error={flow.paymentError}
          onPay={flow.pay}
          onCancel={close}
          onDisconnect={disconnect}
        />
      )}
      {state.step === "confirmed" && <ConfirmationStep order={state.order} onDone={close} onDisconnect={disconnect} />}
    </FlyOut>
  );
}
