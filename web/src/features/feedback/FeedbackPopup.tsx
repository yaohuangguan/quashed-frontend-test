// "How did it go?" popup, shown after a purchase when the fly-out closes.
import { useId, useState } from "react";
import { LIMITS } from "@shared/purchase.ts";
import { Button } from "../../components/Button.tsx";
import { ButtonsPane } from "../../components/ButtonsPane.tsx";
import { Popup } from "../../components/Popup.tsx";
import { api, errorCodeOf, type ApiErrorCode } from "../../lib/api-client.ts";
import { messages } from "../../locales/en.ts";

const t = messages.feedback;

type FeedbackPopupProps = {
  orderId: string;
  onClose: () => void;
};

export function FeedbackPopup({ orderId, onClose }: FeedbackPopupProps) {
  const id = useId();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<ApiErrorCode | null>(null);
  const canSubmit = message.trim().length > 0 && !sending;

  async function submit() {
    setSending(true);
    setError(null);
    try {
      await api.sendFeedback(orderId, message);
      onClose();
    } catch (failure) {
      const code = errorCodeOf(failure);
      // Feedback for this order is already saved, so there is nothing to retry.
      if (code === "FEEDBACK_ALREADY_SENT") onClose();
      else setError(code);
    } finally {
      setSending(false);
    }
  }

  return (
    <Popup labelledBy={`${id}-title`} closeLabel={t.close} onClose={onClose}>
      <form
        className="feedback"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) void submit();
        }}
      >
        <h2 className="feedback__title" id={`${id}-title`}>
          {t.title}
        </h2>
        <p className="feedback__intro">{t.intro}</p>
        <label className="visually-hidden" htmlFor={`${id}-message`}>
          {t.label}
        </label>
        <textarea
          id={`${id}-message`}
          className="feedback__message"
          placeholder={t.placeholder}
          maxLength={LIMITS.feedbackLength}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        {error && (
          <p className="feedback__error" role="alert">
            {messages.errors[error]}
          </p>
        )}
        <ButtonsPane>
          <Button variant="text" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button type="submit" disabled={!canSubmit} aria-busy={sending}>
            {sending ? t.sending : t.submit}
          </Button>
        </ButtonsPane>
      </form>
    </Popup>
  );
}
