import { Button } from "../../components/Button.tsx";
import { closeIcon } from "../../components/icons.ts";
import { ProviderLogo } from "../../components/ProviderLogo.tsx";
import { messages } from "../../locales/en.ts";

type LoadingStepProps = {
  providerId: string;
  providerName: string;
  /** Text under the logo, or an error with a retry button. */
  status: { text: string } | { error: string; onRetry: () => void };
  onClose: () => void;
};

/** "Connecting..." and "Retrieving data..." screens. */
export function LoadingStep({ providerId, providerName, status, onClose }: LoadingStepProps) {
  return (
    <div className="flyout__loading">
      <button type="button" className="icon-button flyout__close" onClick={onClose} aria-label={messages.purchase.close}>
        <img src={closeIcon} alt="" width={20} height={20} />
      </button>
      <div className="loading-box">
        <ProviderLogo id={providerId} name={providerName} />
        {"text" in status ? (
          <p className="loading-box__text" role="status">
            {status.text}
          </p>
        ) : (
          <div className="loading-box__error" role="alert">
            <p>{status.error}</p>
            <Button onClick={status.onRetry}>{messages.purchase.retry}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
