// Step 2: "<Provider> Purchase" card form. Payment is a demo: the card is
// checked here and only its last four digits are sent to the API.
import { useId, useState } from "react";
import { cardFormSchema, toPaymentDetails, type PaymentDetails } from "@shared/purchase.ts";
import { Button } from "../../components/Button.tsx";
import { ButtonsPane } from "../../components/ButtonsPane.tsx";
import { describedBy, Field } from "../../components/Field.tsx";
import { PickerInput } from "../../components/PickerInput.tsx";
import { TextInput } from "../../components/TextInput.tsx";
import { useValidation } from "../../hooks/purchase/use-validation.ts";
import type { CardDraft } from "../../hooks/purchase/use-purchase-flow.ts";
import type { ApiError } from "../../lib/api-client.ts";
import { isoMonthToMasked, maskCardNumber, maskCvv, maskMonth, parseMaskedMonth } from "../../lib/masks.ts";
import { messages } from "../../locales/en.ts";
import { FlyoutHeader } from "./FlyoutHeader.tsx";

const t = messages.purchase;

type PaymentStepProps = {
  providerName: string;
  /** Card fields typed before going back to the form. */
  initial?: CardDraft;
  submitting: boolean;
  error: ApiError | null;
  onPay: (payment: PaymentDetails) => void;
  onBack: (draft: CardDraft) => void;
  onCancel: () => void;
  onDisconnect: () => void;
};

export function PaymentStep(props: PaymentStepProps) {
  const { providerName, initial, submitting, error, onPay, onBack, onCancel, onDisconnect } = props;
  const id = useId();
  const titleId = `${id}-title`;
  const fieldId = (name: string) => `${id}-${name}`;

  const [cardNumber, setCardNumber] = useState(initial?.cardNumber ?? "");
  const [expiry, setExpiry] = useState(initial?.expiry ?? "");
  const [cardHolder, setCardHolder] = useState(initial?.cardHolder ?? "");
  const [cvv, setCvv] = useState(initial?.cvv ?? "");

  const month = parseMaskedMonth(expiry);
  const { data, errorFor, touch } = useValidation(cardFormSchema(new Date()), {
    cardNumber,
    expiryMonth: month?.month,
    expiryYear: month?.year,
    cardHolder,
    cvv,
  });

  /** A field error from the server wins over the local one. */
  const serverError = (field: string) => {
    const path = field === "cardNumber" ? "payment.cardLast4" : `payment.${field}`;
    return error?.fields.find((f) => f.path === path)?.message;
  };
  const errorOf = (field: string) => serverError(field) ?? errorFor(field);
  const expiryError = errorOf("expiryMonth") ?? errorOf("expiryYear");

  return (
    <form
      className="flyout__form"
      aria-labelledby={titleId}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (data && !submitting) onPay(toPaymentDetails(data));
      }}
    >
      <FlyoutHeader titleId={titleId} title={t.paymentTitle(providerName)} onDisconnect={onDisconnect} />
      <div className="flyout__body">
        <div className="form-row">
          <Field id={fieldId("card")} label={t.cardNumber} error={errorOf("cardNumber")}>
            <TextInput
              id={fieldId("card")}
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder={t.cardNumberPlaceholder}
              value={cardNumber}
              onChange={(e) => setCardNumber(maskCardNumber(e.target.value))}
              onBlur={() => touch("cardNumber")}
              {...describedBy(fieldId("card"), errorOf("cardNumber"))}
            />
          </Field>
          <Field id={fieldId("expiry")} label={t.expiry} error={expiryError}>
            <PickerInput
              id={fieldId("expiry")}
              kind="month"
              autoComplete="cc-exp"
              value={expiry}
              placeholder={t.expiryPlaceholder}
              pickerLabel={t.openMonthPicker}
              error={expiryError}
              mask={maskMonth}
              fromPicker={isoMonthToMasked}
              onChange={setExpiry}
              onBlur={() => {
                touch("expiryMonth");
                touch("expiryYear");
              }}
            />
          </Field>
          <Field id={fieldId("holder")} label={t.cardHolder} error={errorOf("cardHolder")}>
            <TextInput
              id={fieldId("holder")}
              autoComplete="cc-name"
              placeholder={t.cardHolderPlaceholder}
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value)}
              onBlur={() => touch("cardHolder")}
              {...describedBy(fieldId("holder"), errorOf("cardHolder"))}
            />
          </Field>
          <Field id={fieldId("cvv")} label={t.cvv} error={errorOf("cvv")}>
            <TextInput
              id={fieldId("cvv")}
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder={t.cvvPlaceholder}
              value={cvv}
              onChange={(e) => setCvv(maskCvv(e.target.value))}
              onBlur={() => touch("cvv")}
              {...describedBy(fieldId("cvv"), errorOf("cvv"))}
            />
          </Field>
        </div>
        <p className="flyout__note">{t.privacy}</p>
        <p className="flyout__demo" role="note">
          {t.demoPayment}
        </p>
        {error && (
          <p className="flyout__error" role="alert">
            {messages.errors[error.code]}
          </p>
        )}
      </div>
      <ButtonsPane
        start={
          <Button
            variant="text"
            backArrow
            disabled={submitting}
            onClick={() => onBack({ cardNumber, expiry, cardHolder, cvv })}
          >
            {t.back}
          </Button>
        }
      >
        <Button variant="text" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button type="submit" disabled={!data || submitting} aria-busy={submitting}>
          {submitting ? t.paying : t.confirmAndPay}
        </Button>
      </ButtonsPane>
    </form>
  );
}
